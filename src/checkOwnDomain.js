export default (url, urlHost) => {
  const { hostname: currentHost } = new URL(url);
  const { hostname: pageHost } = new URL(urlHost);
  return currentHost === pageHost;
};
