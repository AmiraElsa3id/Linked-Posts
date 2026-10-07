async function testSidebarEndpoints() {
  const loginRes = await fetch('https://route-posts.routemisr.com/users/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_user_demo@example.com', password: 'Password123!' }),
  });
  
  let token = null;
  let user = null;
  
  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.token || data.data?.token;
    user = data.user || data.data?.user;
  } else {
    // Signup new user to get valid token
    const signupRes = await fetch('https://route-posts.routemisr.com/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sidebar Test',
        username: 'side' + Math.floor(Math.random() * 9000 + 1000),
        email: `sidebar_${Date.now()}@example.com`,
        dateOfBirth: '1998-05-15',
        gender: 'female',
        password: 'Password123!',
        rePassword: 'Password123!',
      }),
    });
    const sData = await signupRes.json();
    token = sData.token || sData.data?.token;
    user = sData.user || sData.data?.user;
  }

  console.log('Got token:', token ? 'YES' : 'NO', 'User ID:', user?._id);

  // 1. Test GET /users/{userId}/posts (My Posts)
  if (user?._id) {
    const myPostsRes = await fetch(`https://route-posts.routemisr.com/users/${user._id}/posts`, {
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('My Posts Status:', myPostsRes.status, await myPostsRes.json());
  }

  // 2. Test GET /users/bookmarks (Saved)
  const bookmarksRes = await fetch('https://route-posts.routemisr.com/users/bookmarks', {
    headers: { token, Authorization: `Bearer ${token}` },
  });
  console.log('Bookmarks Status:', bookmarksRes.status, await bookmarksRes.json());

  // 3. Test GET /posts/feed vs GET /posts (Community vs Feed)
  const feedRes = await fetch('https://route-posts.routemisr.com/posts', {
    headers: { token, Authorization: `Bearer ${token}` },
  });
  console.log('All Posts Status:', feedRes.status, await feedRes.json());
}

testSidebarEndpoints();
