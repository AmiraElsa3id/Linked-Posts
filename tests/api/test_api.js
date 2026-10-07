async function testApiDirectly() {
  const payload = {
    name: 'Amira Elsa3id',
    username: 'amira' + Math.floor(Math.random() * 9000 + 1000),
    email: `amira_${Date.now()}@example.com`,
    dateOfBirth: '1998-05-15',
    gender: 'female',
    password: 'Password123!',
    rePassword: 'Password123!',
  };

  console.log('Sending Signup payload:', payload);

  const res = await fetch('https://route-posts.routemisr.com/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('Signup Response:', data);
}

testApiDirectly();
