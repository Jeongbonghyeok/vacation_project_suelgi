const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api/inpaint",
    createProxyMiddleware({
      target: 'https://hugmebabe-suelgi-io-api.hf.space',
      changeOrigin: true,
      // 지금 너 상황에서는 프록시 단계에서 path가 '/'로 들어오고 있어서
      // 그냥 무조건 inpaint 엔드포인트로 바꿔버리는 게 제일 확실함
      pathRewrite: () => "/api/v1/inpaint",
    })
  );
};
