"""Create a deterministic, synthetic XLSX fixture for workbook writer probes."""

from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / ".private-probes" / "write-fixture.xlsx"
SHEET_NAMES = ("Du lieu", "Bao cao", "Phu")
HEADERS = (
    "MÃ", "STT", "Nội dung trình", "Sở, ngành", "Loại văn bản",
    "Cấp xin ý kiến", "Tiến độ xin ý kiến", "Tiến độ xây dựng",
    "Tiến độ trình HĐND", "Chuyên viên", "Phòng", "Lãnh đạo Văn phòng",
    "Lãnh đạo UBND", "Tiến độ cụ thể", "Ghi chú", "Trình/Rút",
)
ROWS = (
    ("ID1", "1", "Nội dung mẫu NQ1", "Sở Mẫu", "QPPL", "Cấp mẫu",
     "Đang xử lý mẫu", "Đang xây dựng mẫu", "Đang trình mẫu", "CV Mẫu",
     "Phòng Mẫu", "LĐ VP Mẫu", "LĐ UBND Mẫu", "Tiến độ riêng mẫu", "", ""),
    ("ID2", "2", "Nội dung mẫu NQ2", "Sở Mẫu", "QPPL", "Cấp mẫu",
     "Đang xử lý mẫu", "Đang xây dựng mẫu", "Đang trình mẫu", "CV Mẫu",
     "Phòng Mẫu", "LĐ VP Mẫu", "LĐ UBND Mẫu", "Tiến độ riêng mẫu", "Ghi chú mẫu", ""),
)

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
ET.register_namespace("", MAIN_NS)
ET.register_namespace("r", REL_NS)


def qname(namespace: str, name: str) -> str:
    return f"{{{namespace}}}{name}"


def column_name(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def cell_xml(reference: str, value: str, style: int = 0) -> ET.Element:
    cell = ET.Element(qname(MAIN_NS, "c"), {"r": reference, "t": "inlineStr"})
    if style:
        cell.set("s", str(style))
    inline = ET.SubElement(cell, qname(MAIN_NS, "is"))
    text = ET.SubElement(inline, qname(MAIN_NS, "t"))
    if value[:1].isspace() or value[-1:].isspace():
        text.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    text.text = value
    return cell


def worksheet_xml(rows: list[list[str | None]], *, formula: str | None = None) -> bytes:
    root = ET.Element(qname(MAIN_NS, "worksheet"))
    sheet_data = ET.SubElement(root, qname(MAIN_NS, "sheetData"))
    for row_number, values in enumerate(rows, start=1):
        row = ET.SubElement(sheet_data, qname(MAIN_NS, "row"), {"r": str(row_number)})
        for column_number, value in enumerate(values, start=1):
            if value is None or value == "":
                continue
            row.append(cell_xml(f"{column_name(column_number)}{row_number}", value,
                                1 if row_number == 1 else 2))
    if formula:
        row = next((entry for entry in sheet_data if entry.attrib["r"] == "2"), None)
        if row is None:
            row = ET.SubElement(sheet_data, qname(MAIN_NS, "row"), {"r": "2"})
        cell = ET.SubElement(row, qname(MAIN_NS, "c"), {"r": "B2"})
        formula_node = ET.SubElement(cell, qname(MAIN_NS, "f"))
        formula_node.text = formula
        value_node = ET.SubElement(cell, qname(MAIN_NS, "v"))
        value_node.text = "2"
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def add_file(archive: ZipFile, name: str, content: bytes) -> None:
    info = ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o600 << 16
    archive.writestr(info, content)


def build_workbook() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    data_rows = [list(HEADERS), [None] * 16, [None] * 16,
                 list(ROWS[0]), list(ROWS[1])]
    report_rows: list[list[str | None]] = [["Chỉ số", "Giá trị"], ["Số dòng dữ liệu", None]]
    auxiliary_rows = [["Ghi chú phụ", "Giá trị giả"], ["Marker", "PHU_FIXTURE"]]

    with ZipFile(OUTPUT, "w") as archive:
        types = ET.Element(qname(CT_NS, "Types"))
        ET.SubElement(types, qname(CT_NS, "Default"), {"Extension": "rels", "ContentType": "application/vnd.openxmlformats-package.relationships+xml"})
        ET.SubElement(types, qname(CT_NS, "Default"), {"Extension": "xml", "ContentType": "application/xml"})
        ET.SubElement(types, qname(CT_NS, "Override"), {"PartName": "/xl/workbook.xml", "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"})
        ET.SubElement(types, qname(CT_NS, "Override"), {"PartName": "/xl/styles.xml", "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"})
        for index in range(1, 4):
            ET.SubElement(types, qname(CT_NS, "Override"), {"PartName": f"/xl/worksheets/sheet{index}.xml", "ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"})
        add_file(archive, "[Content_Types].xml", ET.tostring(types, encoding="utf-8", xml_declaration=True))

        package_rels = ET.Element(qname(PKG_REL_NS, "Relationships"))
        ET.SubElement(package_rels, qname(PKG_REL_NS, "Relationship"), {
            "Id": "rId1", "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            "Target": "xl/workbook.xml",
        })
        add_file(archive, "_rels/.rels", ET.tostring(package_rels, encoding="utf-8", xml_declaration=True))

        workbook = ET.Element(qname(MAIN_NS, "workbook"))
        sheets = ET.SubElement(workbook, qname(MAIN_NS, "sheets"))
        for index, sheet_name in enumerate(SHEET_NAMES, start=1):
            ET.SubElement(sheets, qname(MAIN_NS, "sheet"), {
                "name": sheet_name, "sheetId": str(index), qname(REL_NS, "id"): f"rId{index}",
            })
        add_file(archive, "xl/workbook.xml", ET.tostring(workbook, encoding="utf-8", xml_declaration=True))

        workbook_rels = ET.Element(qname(PKG_REL_NS, "Relationships"))
        for index in range(1, 4):
            ET.SubElement(workbook_rels, qname(PKG_REL_NS, "Relationship"), {
                "Id": f"rId{index}",
                "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
                "Target": f"worksheets/sheet{index}.xml",
            })
        ET.SubElement(workbook_rels, qname(PKG_REL_NS, "Relationship"), {
            "Id": "rId4", "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
            "Target": "styles.xml",
        })
        add_file(archive, "xl/_rels/workbook.xml.rels", ET.tostring(workbook_rels, encoding="utf-8", xml_declaration=True))

        styles = ET.Element(qname(MAIN_NS, "styleSheet"))
        fonts = ET.SubElement(styles, qname(MAIN_NS, "fonts"), {"count": "2"})
        ET.SubElement(fonts, qname(MAIN_NS, "font"))
        bold_font = ET.SubElement(fonts, qname(MAIN_NS, "font"))
        ET.SubElement(bold_font, qname(MAIN_NS, "b"))
        fills = ET.SubElement(styles, qname(MAIN_NS, "fills"), {"count": "2"})
        ET.SubElement(fills, qname(MAIN_NS, "fill")).append(ET.Element(qname(MAIN_NS, "patternFill"), {"patternType": "none"}))
        header_fill = ET.SubElement(fills, qname(MAIN_NS, "fill"))
        pattern = ET.SubElement(header_fill, qname(MAIN_NS, "patternFill"), {"patternType": "solid"})
        ET.SubElement(pattern, qname(MAIN_NS, "fgColor"), {"rgb": "FFD9EAF7"})
        ET.SubElement(pattern, qname(MAIN_NS, "bgColor"), {"indexed": "64"})
        borders = ET.SubElement(styles, qname(MAIN_NS, "borders"), {"count": "1"})
        ET.SubElement(borders, qname(MAIN_NS, "border"))
        base_xf = ET.SubElement(styles, qname(MAIN_NS, "cellStyleXfs"), {"count": "1"})
        ET.SubElement(base_xf, qname(MAIN_NS, "xf"), {"numFmtId": "0", "fontId": "0", "fillId": "0", "borderId": "0"})
        cell_xfs = ET.SubElement(styles, qname(MAIN_NS, "cellXfs"), {"count": "3"})
        ET.SubElement(cell_xfs, qname(MAIN_NS, "xf"), {"numFmtId": "0", "fontId": "0", "fillId": "0", "borderId": "0", "xfId": "0"})
        ET.SubElement(cell_xfs, qname(MAIN_NS, "xf"), {"numFmtId": "0", "fontId": "1", "fillId": "1", "borderId": "0", "xfId": "0", "applyFont": "1", "applyFill": "1", "applyAlignment": "1"})
        ET.SubElement(cell_xfs[-1], qname(MAIN_NS, "alignment"), {"wrapText": "1", "vertical": "top"})
        ET.SubElement(cell_xfs, qname(MAIN_NS, "xf"), {"numFmtId": "0", "fontId": "0", "fillId": "0", "borderId": "0", "xfId": "0", "applyAlignment": "1"})
        ET.SubElement(cell_xfs[-1], qname(MAIN_NS, "alignment"), {"wrapText": "1", "vertical": "top"})
        cell_styles = ET.SubElement(styles, qname(MAIN_NS, "cellStyles"), {"count": "1"})
        ET.SubElement(cell_styles, qname(MAIN_NS, "cellStyle"), {"name": "Normal", "xfId": "0", "builtinId": "0"})
        add_file(archive, "xl/styles.xml", ET.tostring(styles, encoding="utf-8", xml_declaration=True))

        sheets_rows = (data_rows, report_rows, auxiliary_rows)
        for index, rows in enumerate(sheets_rows, start=1):
            worksheet = ET.fromstring(worksheet_xml(rows, formula="COUNTA('Du lieu'!A4:A5)" if index == 2 else None))
            cols = ET.Element(qname(MAIN_NS, "cols"))
            width = ET.SubElement(cols, qname(MAIN_NS, "col"), {"min": "1", "max": "1", "width": "16", "customWidth": "1"})
            for col_num in range(2, 17 if index == 1 else 3):
                col_width = "34" if index == 1 and col_num == 3 else "20" if index == 1 else "24"
                ET.SubElement(cols, qname(MAIN_NS, "col"), {"min": str(col_num), "max": str(col_num), "width": col_width, "customWidth": "1"})
            worksheet.insert(0, cols)
            add_file(archive, f"xl/worksheets/sheet{index}.xml", ET.tostring(worksheet, encoding="utf-8", xml_declaration=True))


def verify_and_summarize() -> None:
    namespace = {"m": MAIN_NS}
    with ZipFile(OUTPUT) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        names = [sheet.attrib["name"] for sheet in workbook.findall("m:sheets/m:sheet", namespace)]
        assert names == list(SHEET_NAMES), names
        data = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = data.findall("m:sheetData/m:row", namespace)
        assert len(rows) == 5, len(rows)
        cells = {cell.attrib["r"]: "".join(cell.itertext()) for cell in data.findall(".//m:c", namespace)}
        assert cells.get("A4") == "ID1" and cells.get("A5") == "ID2"
        assert cells.get("O5") == "Ghi chú mẫu"
        assert cells.get("P4", "") == "" and cells.get("O4", "") == ""
        report = ET.fromstring(archive.read("xl/worksheets/sheet2.xml"))
        formula = report.find(".//m:f", namespace)
        assert formula is not None and formula.text == "COUNTA('Du lieu'!A4:A5)"
        assert report.find(".//m:c[@r='B2']", namespace) is not None
        assert "xl/vbaProject.bin" not in archive.namelist()
    print(f"Created {OUTPUT}")
    print("Tabs: Du lieu (A1:P5), Bao cao (A1:B2 with formula), Phu (A1:B2)")
    print("Markers: Du lieu!A4=ID1, Du lieu!A5=ID2, Du lieu!O5=Ghi chú mẫu, Bao cao!B2 formula COUNTA")
    print(f"Bytes: {OUTPUT.stat().st_size}; macro: absent")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    build_workbook()
    verify_and_summarize()
