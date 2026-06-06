export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function methodNotAllowed() {
  return json({ error: 'Phương thức không được hỗ trợ' }, 405);
}

export function publicError(message = 'Yêu cầu chưa xử lý được. Vui lòng thử lại sau.', status = 400) {
  return json({ error: message }, status);
}
