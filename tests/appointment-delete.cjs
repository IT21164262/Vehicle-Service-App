const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('../frontend/node_modules/typescript');
const jwt = require('../backend/node_modules/jsonwebtoken');
const User = require('../backend/models/user.cjs');
const { Appointment } = require('../backend/models/appointment.cjs');
const { Service } = require('../backend/models/service.cjs');

// Run the actual screen, API functions, Express routes and controllers against
// isolated model doubles. No database or deployed application is contacted.
test('appointment deletion, cancellation and service protection stay separate', async () => {
  const owner = '111111111111111111111111';
  const other = '222222222222222222222222';
  const admin = '333333333333333333333333';
  const serviceId = '444444444444444444444444';
  const appointmentId = '555555555555555555555555';
  const secondId = '666666666666666666666666';
  const service = { _id: serviceId, name: 'Oil change', price: 100 };
  const originalService = structuredClone(service);
  const records = new Map();
  const seed = (id, status = 'Pending') => records.set(id, {
    _id: id, userId: owner, serviceId, vehicleNumber: 'ABC-1234',
    appointmentDate: new Date('2030-01-01'), status, async save() {},
  });
  seed(appointmentId);
  seed(secondId);
  const restorations = [];
  function stub(object, key, value) {
    const previous = object[key];
    restorations.push(() => { object[key] = previous; });
    object[key] = value;
  }
  stub(User, 'findById', id => ({ select: async () => ({ _id: id, isAdmin: id === admin, tokenVersion: 0 }) }));
  stub(User, 'updateOne', async () => ({ modifiedCount: 1 }));
  stub(Appointment, 'findById', async id => records.get(id) || null);
  stub(Appointment, 'deleteOne', async ({ _id }) => ({ deletedCount: Number(records.delete(_id)) }));
  stub(Appointment, 'exists', async ({ serviceId: id, status }) => [...records.values()].some(row => row.serviceId === id && (!status || status.$in.includes(row.status))));
  stub(Appointment, 'find', filter => ({ populate: () => ({ sort: async () =>
    [...records.values()].filter(row => !filter.userId || row.userId === filter.userId)
      .map(row => ({ ...row, serviceId: { _id: serviceId, name: service.name } }))
  }) }));
  stub(Service, 'findById', async id => id === serviceId ? service : null);
  const matches = (row, filter) => (!filter._id || row._id === filter._id) && !(filter.isDeleted && row.isDeleted) && (!filter.isPromoted || row.isPromoted);
  stub(Service, 'find', filter => ({ sort: async () => matches(service, filter) ? [service] : [] }));
  stub(Service, 'findOne', filter => ({ select: async () => matches(service, filter) ? service : null }));
  stub(Service, 'exists', async filter => matches(service, filter));
  stub(Service, 'updateOne', async (filter, update) => { Object.assign(service, update.$set); return { modifiedCount: 1 }; });
  let serviceDeletes = 0;
  stub(Service, 'deleteOne', async ({ _id }) => { assert.equal(_id, serviceId); serviceDeletes++; return { deletedCount: 1 }; });
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'isolated-appointment-regression-test-secret';
  const app = require('../backend/app.cjs');
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const requests = [];
  let actor = owner;
  async function request(resource, method = 'GET', body) {
    requests.push([method, resource]);
    const token = jwt.sign({ sub: actor, ver: 0 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return fetch(`http://127.0.0.1:${server.address().port}/api${resource}`, {
      method, signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  async function authenticatedRequest(...args) {
    const response = await request(...args);
    if (response.status === 204) return;
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  }
  function load(relative, dependencies) {
    const filename = path.join(__dirname, '..', relative);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(code, { Error, module, exports: module.exports, require: name => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    } }, { filename });
    return module.exports;
  }
  try {
    const api = load('frontend/src/services/appointmentApi.ts', { './authApi': { authenticatedRequest } });
    const states = [];
    let cursor = 0;
    const refs = [];
    let refCursor = 0;
    const element = (type, props) => ({ type, props });
    const screen = load('frontend/src/screens/AppointmentScreen.tsx', {
      react: {
        useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }]; },
        useCallback: callback => callback, useEffect: () => {},
        useRef: initial => { const index = refCursor++; return refs[index] ||= { current: initial }; },
      },
      'react/jsx-runtime': { jsx: element, jsxs: element },
      'react-native': { Alert: { alert() { throw new Error('Deletion must not depend on native alerts.'); } }, FlatList: 'FlatList', Modal: 'Modal',
        Pressable: 'Pressable', RefreshControl: 'RefreshControl', Text: 'Text', View: 'View',
        StyleSheet: { create: value => value } },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '../services/appointmentApi': api,
      '../components/ServiceUI': { Action: 'Action', Feedback: 'Feedback', PageHeader: 'PageHeader', serviceColors: {}, ui: {} },
    });
    function find(node, predicate) {
      if (!node || typeof node !== 'object') return;
      if (predicate(node)) return node;
      for (const child of [node.props?.children].flat(Infinity)) {
        const result = find(child, predicate); if (result) return result;
      }
    }
    function render(administrator = false) {
      cursor = 0; refCursor = 0;
      return screen.AppointmentScreen({ administrator, onBack() {}, onEdit() {}, onLogout() {} });
    }
    render();
    states[0] = await api.listAppointments(); states[2] = false;
    const list = find(render(), node => node.type === 'FlatList');
    const item = list.props.data.find(row => row.id === appointmentId);
    assert.notEqual(item.id, item.serviceId);
    const card = list.props.renderItem({ item });
    requests.length = 0;
    const openDelete = () => find(card, node => node.type === 'Action' && node.props.title === 'Delete').props.onPress();
    const dialog = () => find(render(), node => node.type === 'Modal');
    const action = title => find(dialog(), node => node.type === 'Action' && node.props.title === title);
    openDelete();
    assert.equal(dialog().props.visible, true);
    assert.equal(requests.length, 0);
    action('Keep appointment').props.onPress();
    assert.equal(dialog().props.visible, false);
    assert.equal(requests.length, 0);
    openDelete();
    dialog().props.onRequestClose();
    assert.equal(dialog().props.visible, false);
    openDelete();
    const confirm = action('Delete appointment').props.onPress;
    const pending = confirm();
    await confirm();
    assert.equal(action('Deleting...').props.busy, true);
    assert.equal(action('Keep appointment').props.disabled, true);
    dialog().props.onRequestClose();
    assert.equal(dialog().props.visible, true);
    await pending;
    assert.equal(dialog().props.visible, false);
    assert.deepEqual(requests, [['DELETE', `/appointments/${appointmentId}`], ['GET', '/appointments']]);
    assert.equal(records.has(appointmentId), false);
    assert.equal(records.has(secondId), true);
    assert.equal(states[0].length, 1);
    assert.equal(states[0][0].id, secondId);
    assert.deepEqual(service, originalService);

    // A booking that changed status must show the API error and stay in history.
    seed(appointmentId, 'Confirmed');
    openDelete();
    await action('Delete appointment').props.onPress();
    assert.equal(dialog().props.visible, true);
    const failure = find(dialog(), node => node.props?.accessibilityRole === 'alert');
    assert.match(failure.props.children, /Only Pending appointments can be deleted/);
    assert.equal(action('Keep appointment').props.disabled, false);
    assert.ok(records.has(appointmentId));
    action('Keep appointment').props.onPress();
    openDelete();
    assert.equal(find(dialog(), node => node.props?.accessibilityRole === 'alert'), undefined);
    action('Keep appointment').props.onPress();

    seed(appointmentId);
    actor = other;
    assert.equal((await request(`/appointments/${appointmentId}`, 'DELETE')).status, 403);
    actor = admin;
    assert.equal((await request(`/appointments/${appointmentId}`, 'DELETE')).status, 403);
    actor = owner;
    for (const status of ['Confirmed', 'Cancelled', 'Completed']) {
      records.get(appointmentId).status = status;
      assert.equal((await request(`/appointments/${appointmentId}`, 'DELETE')).status, 409);
      assert.ok(records.has(appointmentId));
    }
    records.get(appointmentId).status = 'Pending';
    assert.equal((await request(`/appointments/${appointmentId}/status`, 'PATCH', { status: 'Cancelled' })).status, 403);
    assert.equal((await request(`/services/${serviceId}`, 'DELETE')).status, 403);
    actor = admin;
    await api.updateAppointmentStatus(appointmentId, 'Cancelled');
    assert.equal(records.get(appointmentId).status, 'Cancelled');
    assert.equal(records.size, 2);
    const blocked = await request(`/services/${serviceId}`, 'DELETE');
    assert.equal(blocked.status, 409);
    assert.match((await blocked.json()).message, /Pending or Confirmed appointments/);
    const adminList = find(render(true), node => node.type === 'FlatList');
    const adminCard = adminList.props.renderItem({ item: { ...item, status: 'Pending' } });
    assert.equal(find(adminCard, node => node.type === 'Action' && node.props.title === 'Delete'), undefined);
    assert.ok(find(adminCard, node => node.type === 'Action' && node.props.title === 'Cancel'));
    assert.equal(serviceDeletes, 0);
    assert.deepEqual(service, originalService);

    // Completed history cannot be deleted by customers or administrators.
    records.get(appointmentId).status = 'Completed';
    for (const [user, expected] of [[other, 403], [owner, 409], [admin, 403]]) {
      actor = user;
      assert.equal((await request(`/appointments/${appointmentId}`, 'DELETE')).status, expected);
      assert.ok(records.has(appointmentId));
    }
    for (const administrator of [false, true]) {
      states[0] = await api.listAppointments();
      const completedList = find(render(administrator), node => node.type === 'FlatList');
      const completed = completedList.props.data.find(row => row.id === appointmentId);
      const card = completedList.props.renderItem({ item: completed });
      assert.equal(find(card, node => node.type === 'Action' && ['Edit', 'Delete'].includes(node.props.title)), undefined);
    }
    // Both kinds of active booking protect the service.
    for (const status of ['Pending', 'Confirmed']) {
      records.get(secondId).status = status;
      assert.equal((await request(`/services/${serviceId}`, 'DELETE')).status, 409);
    }
    records.get(secondId).status = 'Cancelled';
    assert.equal((await request(`/services/${serviceId}`, 'DELETE')).status, 204);
    assert.equal(serviceDeletes, 0);
    assert.equal(service.isDeleted, true);
    assert.equal(records.size, 2);
    const history = await api.listAppointments();
    assert.equal(history.length, 2);
    assert.ok(history.every(row => row.serviceName === 'Oil change'));
    assert.deepEqual((await (await request('/services')).json()).services, []);
    assert.deepEqual((await (await request('/services/promoted')).json()).services, []);
    assert.equal((await request(`/services/${serviceId}`)).status, 404);
    assert.equal((await request(`/services/${serviceId}`, 'PATCH', { name: 'Renamed' })).status, 404);
    assert.equal((await request(`/services/${serviceId}`, 'DELETE')).status, 404);
    actor = owner;
    assert.equal((await request('/appointments', 'POST', { userId: owner, serviceId, vehicleNumber: 'ABC-1234', appointmentDate: '2030-01-01' })).status, 404);
    seed(secondId);
    assert.equal((await request(`/appointments/${secondId}`, 'PATCH', { serviceId })).status, 404);
    // An unreferenced service can still be physically deleted.
    records.clear();
    delete service.isDeleted;
    actor = admin;
    assert.equal((await request(`/services/${serviceId}`, 'DELETE')).status, 204);
    assert.equal(serviceDeletes, 1);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    for (const restore of restorations.reverse()) restore();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});
