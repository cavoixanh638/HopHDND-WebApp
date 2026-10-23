"""No live Google Drive / Firebase calls: source conversion contract tests."""
import io
import unittest
from openpyxl import Workbook
from sync import parse_workbook, simple

SOURCE="1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344"
HEADERS=[
    "ID","STT","Nội dung trình","Sở, ngành chủ trì","Loại VB",
    "Cấp Thành ủy cho ý kiến","Tiến độ xin ý kiến Thành ủy",
    "Tiến độ trình HĐND xây dựng NQ","Tiến độ trình HĐND ban hành NQ/BC",
    "Chuyên viên VPUB","Phòng chuyên môn","Lãnh đạo VP",
    "Lãnh đạo UBND TP","Tiến độ hiện tại","Ghi chú"
]
def fixture(broken=False):
    wb=Workbook();ws=wb.active;ws.title="Các nội dung trình HĐND"
    headers=HEADERS.copy()
    if broken:headers[13]="X"
    ws.append(headers)
    ws.append(["0001",1,"Văn bản A","Sở A","HC","","","","","Tên A","Phòng A","VP","UBND","Đang làm","Ghi chú 1"])
    ws.append(["0002",2,"Văn bản B","Sở B","QPPL","","","","","Tên B","Phòng B","VP","UBND","Đã trình","Ghi chú 2"])
    ws.append(["BC03",3,"Báo cáo C","Sở C","BC","","","","","Tên C","Phòng C","VP","UBND","Chưa trình","Ghi chú 3"])
    f=io.BytesIO();wb.save(f);return f.getvalue()

class MirrorImportTests(unittest.TestCase):
    def test_excel_a_to_o_exact_metadata(self):
        rows,warnings=parse_workbook(fixture(),"Các nội dung trình HĐND",SOURCE)
        self.assertEqual(len(rows),3)
        self.assertEqual([v["documentKind"] for v in rows],["NQ","NQ","BC"])
        self.assertEqual(rows[0]["recordId"],SOURCE+":row:2")
        self.assertEqual(rows[0]["specificProgress"],"Đang làm")
        self.assertEqual(rows[1]["note"],"Ghi chú 2")
        self.assertEqual(len(warnings),0)
    def test_no_guessing_wrong_sheet_or_column(self):
        with self.assertRaises(ValueError): parse_workbook(fixture(),"Sheet1",SOURCE)
        with self.assertRaises(ValueError):parse_workbook(fixture(broken=True),"Các nội dung trình HĐND",SOURCE)
    def test_vietnamese_labels(self):
        self.assertEqual(simple("Tiến độ hiện tại"),"tien do hien tai")
        self.assertEqual(simple("Báo cáo"),"bao cao")

if __name__=="__main__":
    unittest.main()
