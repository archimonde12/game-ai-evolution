#!/usr/bin/env python3
"""
Máy chủ tĩnh cho việc chạy thử — GIỐNG `python3 -m http.server`, THÊM ĐÚNG MỘT THỨ:
nó nói với trình duyệt là đừng nhớ gì cả.

VÌ SAO PHẢI CÓ TỆP NÀY.
`python3 -m http.server` gửi đúng một header liên quan tới bộ nhớ đệm: `Last-Modified`.
Không `Cache-Control`, không `Expires`. Theo RFC 9111, khi máy chủ không nói gì về hạn
dùng thì trình duyệt được phép TỰ ĐOÁN, và con số thông dụng là 10% khoảng cách từ
`Last-Modified` tới bây giờ. Một tệp sửa lần cuối 6 ngày trước vì thế được coi là còn
tươi trong ~14 giờ — và trong 14 giờ đó trình duyệt phục vụ bản cũ mà KHÔNG HỎI máy
chủ lấy một lần. Sửa tệp trên đĩa cũng vô ích: cái vòng lặp ấy không có máy chủ trong
đó.

Đây đúng là con lỗi đã ăn thời gian của cả dự án dưới hai bộ mặt:
  · người chơi mở `localhost:8123` vẫn thấy bản mô phỏng cũ sau khi `index.html`
    đã bị thay hoàn toàn;
  · và cái nghi lễ "sửa .js mà hành vi không đổi thì ĐỔI CỔNG" ghi trong CLAUDE.md —
    đổi cổng chỉ là cách đổi URL để trình duyệt coi đó là một tài nguyên khác.
`no-store` cắt cả hai từ gốc: nó cấm lưu, nên không có gì để mà đoán hạn.

LƯU Ý: `no-store` chỉ áp cho những lần tải SAU. Bản đã nằm trong đệm từ trước vẫn phải
nạp cứng một lần (Cmd+Shift+R) để đuổi đi.
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # `no-store` là cái làm việc thật. Hai dòng còn lại dành cho proxy và cho
        # những trình duyệt cũ chỉ hiểu HTTP/1.0 — rẻ, và không có tác dụng phụ.
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    # KHÔNG bịt log. Bản đầu của tệp này chỉ in yêu cầu khác 200 cho "gọn", và đúng
    # cái đó đã làm mù phép chẩn đoán quan trọng nhất mà một máy chủ tĩnh có thể cho:
    # yêu cầu CÓ tới máy chủ hay không. Khi trình duyệt phục vụ từ đệm, nó không hỏi —
    # nên một dòng log TRỐNG chính là bằng chứng, và bịt log là vứt bằng chứng đi.


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
# Cho phép dùng lại cổng ngay sau khi tắt: không có dòng này thì cổng vừa dùng bị kẹt
# ở TIME_WAIT vài chục giây, và lần khởi động lại kế tiếp chết bằng "Address already
# in use" — đúng vào lúc người ta đang khởi động lại để thấy bản sửa.
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', port), NoCacheHandler) as httpd:
    print('Chúa Tể — http://127.0.0.1:%d  (không lưu đệm)' % port, flush=True)
    httpd.serve_forever()
