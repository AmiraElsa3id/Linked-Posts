async function testNotificationsAPI() {
  const loginRes = await fetch('https://route-posts.routemisr.com/users/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_user_demo@example.com', password: 'Password123!' }),
  });
  
  let token = null;
  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.token || data.data?.token;
  }

  if (token) {
    // 1. GET /notifications
    const notifRes = await fetch('https://route-posts.routemisr.com/notifications', {
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('Notifications Status:', notifRes.status, await notifRes.json());

    // 2. GET /notifications/unread-count
    const countRes = await fetch('https://route-posts.routemisr.com/notifications/unread-count', {
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('Unread Count Status:', countRes.status, await countRes.json());
  }
}

testNotificationsAPI();
