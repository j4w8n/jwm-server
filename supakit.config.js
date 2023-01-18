const config = {
	supakit: {
    cookie: {
      options: {
        path: '/',
        sameSite: 'strict'
      },
    },
    redirects: {
      login: '/app',
      logout: '/' 
    }
	}
};

export default config