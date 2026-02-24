function handleLogin(ss, data) {
  // Simple hardcoded check for now, or you can store admins in a sheet
  if (data.username === 'admin' && data.password === 'admin123') {
     return { status: 'success', message: 'Login successful' };
  }
  return { status: 'error', message: 'Invalid credentials' };
}
