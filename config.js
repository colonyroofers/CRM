exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      apiKey: "AIzaSyCawWMq5X2OpWsmplOYxrR6bhyHeAzXKFw",
      authDomain: "colony-inspection-app.firebaseapp.com",
      projectId: "colony-inspection-app",
      storageBucket: "colony-inspection-app.firebasestorage.app",
      messagingSenderId: "869437682472",
      appId: "1:869437682472:web:6df5166ffd01fe4209d61d",
      measurementId: "G-1ZVLVL06CB"
    }),
  };
};
