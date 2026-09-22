# Vehicle-Service-App
A vehicle service appointment mobile app built with React Native, Node.js, Express and MongoDB, allowing customers to book services and administrators to manage appointments.

Service images are uploaded by administrators through the authenticated service image endpoint and stored under `backend/uploads/services`. Set `PUBLIC_API_ORIGIN` in the backend environment so returned image URLs use the deployed public origin. This filesystem strategy survives backend restarts when the deployment provides persistent disk; ephemeral deployments require object storage before production use.
