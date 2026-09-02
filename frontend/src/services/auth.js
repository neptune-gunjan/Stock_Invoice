export function getToken() {
  return localStorage.getItem("access_token");
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type");
  window.location.href = "/login";
}