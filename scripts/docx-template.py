#!/usr/bin/env python3
"""Builds docs/reference.docx, the Word template used by `npm run docs:docx`.

It starts from pandoc's default reference document and applies the Rosavin
look: A4 pages, Arial (full Vietnamese coverage on Windows and macOS), brand
colours, a gold rule under section headings, styled tables, tips and code,
and a page-number footer.

    python3 scripts/docx-template.py
"""
import os
import re
import subprocess
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "reference.docx")

INK = "24312C"
GREEN = "0F4A37"
EMERALD = "1B6B51"
GOLD = "E9A23B"
GOLD_INK = "B26B1F"
MUTED = "6B7F77"
CREAM = "FBF4E6"
SAND = "F3EAD9"
LINE = "DDD3C0"
FONT = "Arial"
MONO = "Consolas"


def fonts(name):
    return f'<w:rFonts w:ascii="{name}" w:hAnsi="{name}" w:eastAsia="{name}" w:cs="{name}"/>'


def replace_style(styles, style_id, xml):
    pattern = re.compile(r'<w:style [^>]*w:styleId="%s".*?</w:style>' % re.escape(style_id), re.S)
    if pattern.search(styles):
        return pattern.sub(lambda _: xml, styles, count=1)
    return styles.replace("</w:styles>", xml + "</w:styles>")


def paragraph_style(style_id, name, based_on="Normal", ppr="", rpr="", next_style=None, extra=""):
    nxt = f'<w:next w:val="{next_style}"/>' if next_style else ""
    return (
        f'<w:style w:type="paragraph" w:customStyle="1" w:styleId="{style_id}"><w:name w:val="{name}"/>'
        f'<w:basedOn w:val="{based_on}"/>{nxt}{extra}<w:qFormat/><w:pPr>{ppr}</w:pPr><w:rPr>{rpr}</w:rPr></w:style>'
    )


def heading(style_id, level, size, color, before, after, border=False):
    bdr = f'<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="{GOLD}"/></w:pBdr>' if border else ""
    return (
        f'<w:style w:type="paragraph" w:styleId="{style_id}"><w:name w:val="heading {level}"/>'
        f'<w:basedOn w:val="Normal"/><w:next w:val="BodyText"/><w:link w:val="{style_id}Char"/>'
        f'<w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/>'
        f'<w:pPr><w:keepNext/><w:keepLines/>{bdr}<w:spacing w:before="{before}" w:after="{after}"/>'
        f'<w:outlineLvl w:val="{level - 1}"/></w:pPr>'
        f'<w:rPr>{fonts(FONT)}<w:b/><w:bCs/><w:color w:val="{color}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr></w:style>'
    )


def build_styles(styles):
    # Document defaults: Arial 10.5 pt, comfortable line height.
    styles = re.sub(
        r"<w:docDefaults>.*?</w:docDefaults>",
        "<w:docDefaults><w:rPrDefault><w:rPr>" + fonts(FONT) +
        f'<w:color w:val="{INK}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/>'
        '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>',
        styles,
        flags=re.S,
    )
    styles = replace_style(styles, "Normal",
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>'
        f'<w:rPr>{fonts(FONT)}<w:color w:val="{INK}"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>')
    styles = replace_style(styles, "BodyText",
        '<w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/>'
        '<w:link w:val="BodyTextChar"/><w:qFormat/><w:pPr><w:spacing w:before="60" w:after="120"/></w:pPr></w:style>')
    styles = replace_style(styles, "Compact",
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Compact"><w:name w:val="Compact"/><w:basedOn w:val="BodyText"/>'
        '<w:qFormat/><w:pPr><w:spacing w:before="30" w:after="30"/></w:pPr></w:style>')
    styles = replace_style(styles, "Title",
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="BodyText"/>'
        '<w:link w:val="TitleChar"/><w:uiPriority w:val="10"/><w:qFormat/>'
        f'<w:pPr><w:spacing w:before="120" w:after="80"/><w:jc w:val="center"/></w:pPr>'
        f'<w:rPr>{fonts(FONT)}<w:b/><w:color w:val="{GREEN}"/><w:sz w:val="64"/><w:szCs w:val="64"/></w:rPr></w:style>')
    styles = replace_style(styles, "Subtitle",
        '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="BodyText"/>'
        '<w:link w:val="SubtitleChar"/><w:uiPriority w:val="11"/><w:qFormat/><w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr>'
        f'<w:rPr>{fonts(FONT)}<w:color w:val="{GOLD_INK}"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>')
    styles = replace_style(styles, "Heading1", heading("Heading1", 1, 48, GREEN, 240, 160))
    styles = replace_style(styles, "Heading2", heading("Heading2", 2, 34, GREEN, 420, 140, border=True))
    styles = replace_style(styles, "Heading3", heading("Heading3", 3, 26, EMERALD, 280, 100))
    styles = replace_style(styles, "BlockText",
        paragraph_style("BlockText", "Block Text", "BodyText",
            ppr=f'<w:pBdr><w:left w:val="single" w:sz="24" w:space="10" w:color="{GOLD}"/></w:pBdr>'
                f'<w:shd w:val="clear" w:color="auto" w:fill="{CREAM}"/><w:spacing w:before="120" w:after="160"/>'
                '<w:ind w:left="240" w:right="120"/>',
            rpr=f'<w:color w:val="{INK}"/>', next_style="BodyText"))
    styles = replace_style(styles, "Figure",
        paragraph_style("Figure", "Figure", ppr='<w:spacing w:before="160" w:after="60"/><w:jc w:val="center"/>'))
    styles = replace_style(styles, "CaptionedFigure",
        paragraph_style("CaptionedFigure", "Captioned Figure", "Figure", ppr='<w:keepNext/><w:spacing w:before="160" w:after="60"/><w:jc w:val="center"/>'))
    styles = replace_style(styles, "ImageCaption",
        paragraph_style("ImageCaption", "Image Caption", "Caption",
            ppr='<w:spacing w:before="40" w:after="240"/><w:jc w:val="center"/>',
            rpr=f'<w:i/><w:color w:val="{MUTED}"/><w:sz w:val="18"/><w:szCs w:val="18"/>'))
    styles = replace_style(styles, "Hyperlink",
        '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="BodyTextChar"/>'
        f'<w:rPr><w:color w:val="{EMERALD}"/><w:u w:val="single"/></w:rPr></w:style>')
    styles = replace_style(styles, "VerbatimChar",
        '<w:style w:type="character" w:customStyle="1" w:styleId="VerbatimChar"><w:name w:val="Verbatim Char"/><w:basedOn w:val="BodyTextChar"/>'
        f'<w:rPr>{fonts(MONO)}<w:color w:val="{GREEN}"/><w:sz w:val="19"/><w:szCs w:val="19"/>'
        f'<w:shd w:val="clear" w:color="auto" w:fill="{SAND}"/></w:rPr></w:style>')
    styles = replace_style(styles, "SourceCode",
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="SourceCode"><w:name w:val="Source Code"/><w:basedOn w:val="Normal"/>'
        '<w:link w:val="VerbatimChar"/><w:pPr>'
        f'<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="{LINE}"/><w:left w:val="single" w:sz="4" w:space="6" w:color="{LINE}"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="6" w:color="{LINE}"/><w:right w:val="single" w:sz="4" w:space="6" w:color="{LINE}"/></w:pBdr>'
        f'<w:shd w:val="clear" w:color="auto" w:fill="{SAND}"/><w:wordWrap w:val="off"/>'
        '<w:spacing w:before="120" w:after="200" w:line="240" w:lineRule="auto"/><w:ind w:left="120" w:right="120"/></w:pPr>'
        f'<w:rPr>{fonts(MONO)}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>')
    styles = replace_style(styles, "Table",
        '<w:style w:type="table" w:default="1" w:styleId="Table"><w:name w:val="Table"/><w:basedOn w:val="TableNormal"/>'
        '<w:uiPriority w:val="59"/><w:qFormat/>'
        '<w:pPr><w:spacing w:before="40" w:after="40" w:line="264" w:lineRule="auto"/></w:pPr>'
        '<w:rPr><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>'
        '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/>'
        f'<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="{LINE}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="{LINE}"/>'
        f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{LINE}"/></w:tblBorders>'
        '<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>'
        '<w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr>'
        f'<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="{GREEN}"/><w:vAlign w:val="center"/></w:tcPr></w:tblStylePr>'
        '</w:style>')
    return styles


FOOTER = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">Rosavin  ·  </w:t></w:r>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r>'
    f'<w:r><w:rPr><w:color w:val="{MUTED}"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>'
    '</w:p></w:ftr>'
)

# A4 portrait, 2 cm margins, footer reference.
SECT_PR = (
    '<w:sectPr><w:footerReference w:type="default" r:id="rIdRosavinFooter"/>'
    '<w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>'
    '<w:cols w:space="720"/></w:sectPr>'
)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        default = os.path.join(tmp, "default.docx")
        with open(default, "wb") as fh:
            fh.write(subprocess.check_output(["pandoc", "--print-default-data-file", "reference.docx"]))
        with zipfile.ZipFile(default) as zin:
            files = {name: zin.read(name) for name in zin.namelist()}

    files["word/styles.xml"] = build_styles(files["word/styles.xml"].decode("utf-8")).encode("utf-8")

    document = files["word/document.xml"].decode("utf-8")
    if 'xmlns:r="' not in document:
        document = document.replace("<w:document ", '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ', 1)
    document = re.sub(r"<w:sectPr.*?</w:sectPr>|<w:sectPr[^>]*/>", "", document, flags=re.S)
    document = document.replace("</w:body>", SECT_PR + "</w:body>")
    files["word/document.xml"] = document.encode("utf-8")

    files["word/footer1.xml"] = FOOTER.encode("utf-8")
    rels = files["word/_rels/document.xml.rels"].decode("utf-8")
    if "rIdRosavinFooter" not in rels:
        rels = rels.replace(
            "</Relationships>",
            '<Relationship Id="rIdRosavinFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
        )
    files["word/_rels/document.xml.rels"] = rels.encode("utf-8")
    types = files["[Content_Types].xml"].decode("utf-8")
    if "/word/footer1.xml" not in types:
        types = types.replace(
            "</Types>",
            '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
        )
    files["[Content_Types].xml"] = types.encode("utf-8")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zout:
        # [Content_Types].xml must be the first entry.
        zout.writestr("[Content_Types].xml", files.pop("[Content_Types].xml"))
        for name, data in files.items():
            zout.writestr(name, data)
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
