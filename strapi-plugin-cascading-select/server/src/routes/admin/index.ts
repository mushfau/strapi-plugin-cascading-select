const config = {
  policies: ['admin::isAuthenticatedAdmin'],
};

export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/options/parents',
      handler: 'options.parents',
      config,
    },
    {
      method: 'GET',
      path: '/options/children',
      handler: 'options.children',
      config,
    },
  ],
});
