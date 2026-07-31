/**
 * Hàm phân tích chuỗi User-Agent để lấy tên HĐH và Trình duyệt thân thiện
 */
export function parseUserAgent(uaString?: string): string {
  if (!uaString) return 'Thiết bị không xác định';

  let os = 'Thiết bị lạ';
  if (/windows/i.test(uaString)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(uaString)) os = 'MacOS';
  else if (/iphone|ipad|ipod/i.test(uaString)) os = 'iOS';
  else if (/android/i.test(uaString)) os = 'Android';
  else if (/linux/i.test(uaString)) os = 'Linux';

  let browser = 'Trình duyệt';
  if (/edg/i.test(uaString)) browser = 'Edge';
  else if (/chrome|crios/i.test(uaString) && !/edg/i.test(uaString)) browser = 'Chrome';
  else if (/safari/i.test(uaString) && !/chrome|crios/i.test(uaString)) browser = 'Safari';
  else if (/firefox|fxios/i.test(uaString)) browser = 'Firefox';

  return `${os} (${browser})`;
}
