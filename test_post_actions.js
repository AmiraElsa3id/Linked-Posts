async function testPostInteractions() {
  const loginRes = await fetch('https://route-posts.routemisr.com/users/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_user_demo@example.com', password: 'Password123!' }),
  });
  
  let token = null;
  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.token || data.data?.token;
  } else {
    const signupRes = await fetch('https://route-posts.routemisr.com/users/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Interactions Test',
        username: 'inter' + Math.floor(Math.random() * 9000 + 1000),
        email: `inter_${Date.now()}@example.com`,
        dateOfBirth: '1998-05-15',
        gender: 'female',
        password: 'Password123!',
        rePassword: 'Password123!',
      }),
    });
    const sData = await signupRes.json();
    token = sData.token || sData.data?.token;
  }

  // Get a post ID
  const postsRes = await fetch('https://route-posts.routemisr.com/posts?limit=1', {
    headers: { token, Authorization: `Bearer ${token}` },
  });
  const postsData = await postsRes.json();
  const samplePost = postsData.data?.posts?.[0] || postsData.posts?.[0];
  const postId = samplePost?._id;

  console.log('Sample Post ID:', postId, 'Privacy state:', samplePost?.privacy || 'public');

  if (postId) {
    // 1. Test Like Post
    const likeRes = await fetch(`https://route-posts.routemisr.com/posts/${postId}/like`, {
      method: 'PUT',
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('Like Status:', likeRes.status, await likeRes.json());

    // 2. Test Bookmark Post
    const bookmarkRes = await fetch(`https://route-posts.routemisr.com/posts/${postId}/bookmark`, {
      method: 'PUT',
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('Bookmark Status:', bookmarkRes.status, await bookmarkRes.json());

    // 3. Test Add Comment
    const commentRes = await fetch(`https://route-posts.routemisr.com/posts/${postId}/comments`, {
      method: 'POST',
      headers: { token, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Awesome post!' }),
    });
    console.log('Add Comment Status:', commentRes.status, await commentRes.json());

    // 4. Test Fetch Comments
    const getCommentsRes = await fetch(`https://route-posts.routemisr.com/posts/${postId}/comments`, {
      headers: { token, Authorization: `Bearer ${token}` },
    });
    console.log('Get Comments Status:', getCommentsRes.status, await getCommentsRes.json());
  }
}

testPostInteractions();
