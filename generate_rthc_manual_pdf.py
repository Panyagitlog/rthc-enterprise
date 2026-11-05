from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, ListFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "RTHC_User_Manual_Professional.pdf"
LOGO_PATH = ROOT / "public" / "dmcfs.png"
SCREENSHOT_DIR = ROOT / "RTHC_User_Manual" / "screenshots" / "coordinator" / "screenshots"
PLACEHOLDER_URL = "[Official RTHC Website URL – To Be Confirmed by Head Office]"

styles = getSampleStyleSheet()
brand_blue = HexColor("#0B1F3A")
brand_teal = HexColor("#1C9BD6")
brand_cyan = HexColor("#A9E8FF")
brand_green = HexColor("#1BBF9A")
brand_text = HexColor("#243B53")
muted = HexColor("#61758A")
panel = HexColor("#EEF7FF")
line = HexColor("#D7E3F0")

styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverSubtitle", parent=styles["BodyText"], fontName="Helvetica", fontSize=11.5, leading=18, textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=brand_blue, spaceBefore=8, spaceAfter=8, keepWithNext=1))
styles.add(ParagraphStyle(name="SectionText", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=16, textColor=brand_text, spaceAfter=8))
styles.add(ParagraphStyle(name="BulletText", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.2, leading=15, textColor=brand_text, leftIndent=14, bulletIndent=8, spaceAfter=3))
styles.add(ParagraphStyle(name="InfoNote", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=9.5, leading=14, textColor=brand_blue, backColor=panel, borderColor=line, borderPadding=8, borderWidth=1, spaceAfter=10))
styles.add(ParagraphStyle(name="Caption", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=muted, alignment=TA_CENTER, spaceBefore=5, spaceAfter=8))
styles.add(ParagraphStyle(name="FooterText", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.white))


def add_list(story, items):
    story.append(ListFlowable([
        Paragraph(item, styles["BulletText"]) for item in items
    ], bulletType="bullet", bulletFontName="Helvetica", bulletFontSize=9, leftIndent=18, spacing=6))


def image_block(story, image_path: Path, caption: str, max_width=162 * mm, max_height=100 * mm):
    if not image_path.exists():
        story.append(Paragraph(f"Screenshot unavailable: {image_path.name}", styles["SectionText"]))
        return

    with PILImage.open(image_path) as pil_image:
        img_width, img_height = pil_image.size

    if img_width > img_height:
        target_width = min(img_width, max_width)
        target_height = target_width * (img_height / img_width)
        if target_height > max_height:
            target_height = max_height
            target_width = target_height * (img_width / img_height)
    else:
        target_height = min(img_height, max_height)
        target_width = target_height * (img_width / img_height)
        if target_width > max_width:
            target_width = max_width
            target_height = target_width * (img_height / img_width)

    img = Image(str(image_path), width=target_width, height=target_height)
    story.append(img)
    story.append(Paragraph(caption, styles["Caption"]))
    story.append(Spacer(1, 4 * mm))


def add_header(story):
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("DMCFS Pvt. Ltd.", styles["CoverSubtitle"]))


def build_story():
    story = []
    cover_bg = HexColor("#081A2E")

    story.append(Spacer(1, 18 * mm))
    if LOGO_PATH.exists():
        logo = Image(str(LOGO_PATH), width=28 * mm, height=28 * mm)
        story.append(logo)
        story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("RTHC", styles["CoverTitle"]))
    story.append(Paragraph("REAL-TIME HEAD COUNT", styles["CoverSubtitle"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("COORDINATOR USER MANUAL", styles["CoverTitle"]))
    story.append(Paragraph("Step-by-Step Guide for Workforce Headcount Reporting", styles["CoverSubtitle"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Document Version: 1.0", styles["CoverSubtitle"]))
    story.append(Paragraph("Prepared for RTHC Coordinator users", styles["CoverSubtitle"]))
    story.append(Paragraph("Head Office support: Mr. Pranav Phalke", styles["CoverSubtitle"]))

    story.append(PageBreak())

    story.append(Paragraph("1. Introduction", styles["SectionTitle"]))
    story.append(Paragraph(
        "RTHC (Real-Time Head Count) is used by coordinators to report workforce requirements, filled positions, vacancies, and operational headcount information for their assigned company and location. It helps the Head Office track actual workforce status and identify staffing gaps before they affect operations.",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "Accurate and timely reporting is important because it supports workforce planning, vacancy control, manpower availability, and daily operational decisions. Incorrect data leads to incorrect staffing decisions and poor planning.",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "This manual is specifically for RTHC Coordinators. It explains the coordinator workflow only and does not include Super Admin functions such as user management, company administration, or administrative settings.",
        styles["InfoNote"],
    ))

    story.append(Paragraph("2. Accessing the Website", styles["SectionTitle"]))
    story.append(Paragraph(
        "Use a browser on a desktop computer, laptop, tablet, or mobile phone. Open the official RTHC website address in the browser and confirm that the page is the DMCFS RTHC portal before logging in.",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "Website address: " + PLACEHOLDER_URL + "<br/>" +
        "Open Google Chrome, Microsoft Edge, or another modern browser and then enter the official site address.",
        styles["SectionText"],
    ))
    image_block(story, SCREENSHOT_DIR / "05-coordinator-login-page.png", "Figure 1: Coordinator login screen used to access the RTHC platform.")
    story.append(Paragraph(
        "The login page is the entry point to the RTHC system. Verify that the page belongs to the DMCFS RTHC platform before entering the user ID and password.",
        styles["SectionText"],
    ))

    story.append(Paragraph("3. Coordinator Login", styles["SectionTitle"]))
    add_list(story, [
        "Open the RTHC login page in your browser.",
        "Enter the user ID or email provided by the Head Office.",
        "Enter the assigned password. Use the password visibility control if you need to confirm it.",
        "Click Sign In.",
        "Wait for the coordinator dashboard to load.",
    ])
    story.append(Paragraph(
        "Login credentials are issued by Head Office. Do not share your user ID or password with other employees. If you are unable to log in, contact the Head Office before continuing.",
        styles["InfoNote"],
    ))
    image_block(story, SCREENSHOT_DIR / "05-coordinator-login-page.png", "Figure 2: Login workflow: enter user ID/email and password, then sign in.")

    story.append(Paragraph("4. Verify Your Coordinator Information", styles["SectionTitle"]))
    story.append(Paragraph(
        "After login, the coordinator dashboard opens. Before submitting headcount data, verify the information shown in the top section of the dashboard.",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "Check the following items carefully:<br/>• Coordinator name<br/>• Assigned company<br/>• Assigned location",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "Example based on the screenshot:<br/>Coordinator: Ganesh Abhang<br/>Company: Chakan Field Officer<br/>Location: Chakan MIDC",
        styles["InfoNote"],
    ))
    image_block(story, SCREENSHOT_DIR / "01-coordinator-dashboard-headcount.png", "Figure 3: Coordinator dashboard showing the assigned coordinator name, company, and location.")
    story.append(Paragraph(
        "If the assigned company or location is not correct, do not submit the form. Contact Head Office before entering or submitting headcount information.",
        styles["SectionText"],
    ))

    story.append(Paragraph("5. Select the Scheme", styles["SectionTitle"]))
    story.append(Paragraph(
        "Locate the Scheme dropdown in the headcount form. Choose the scheme that matches the assigned workforce and the operational requirement. Confirm the selected scheme before continuing.",
        styles["SectionText"],
    ))
    add_list(story, [
        "Open the headcount form.",
        "Find the Scheme dropdown.",
        "Review the available schemes.",
        "Select the correct scheme for the assigned workforce.",
        "Confirm the selected scheme before entering the headcount values.",
    ])
    story.append(Paragraph(
        "Examples of schemes shown in the project include: BVOC, DVOC, NAPS, NATS, and WILP. The actual scheme list may vary by assignment and company.",
        styles["SectionText"],
    ))
    image_block(story, SCREENSHOT_DIR / "03-scheme-selection.png", "Figure 4: Scheme selection dropdown with examples such as BVOC, DVOC, NAPS, NATS, and WILP.")

    story.append(Paragraph("6. Select the Shift and Enter Headcount", styles["SectionTitle"]))
    story.append(Paragraph(
        "In the Today's Head Count form, select the shift and complete the daily workforce entry. If you are reporting the morning shift, choose Morning. Use the relevant shift option based on the assigned work period.",
        styles["SectionText"],
    ))
    add_list(story, [
        "Locate the Today's Head Count form.",
        "Select the correct shift, such as Morning, Mid, or Night.",
        "Enter the workforce requirement.",
        "Enter the number of positions already filled.",
        "Add optional remarks when required.",
        "Review the figures before submission.",
    ])
    image_block(story, SCREENSHOT_DIR / "04-coordinator-full-page-entry-and-history.png", "Figure 5: Headcount entry screen showing shift, requirement, filled count, remarks, and previous entries.")
    story.append(Paragraph(
        "The system calculates vacancy or balance automatically based on the requirement and filled count. This helps the coordinator confirm whether manpower is below or above the requirement.",
        styles["SectionText"],
    ))

    story.append(Paragraph("7. Submit the Daily Headcount", styles["SectionTitle"]))
    story.append(Paragraph(
        "When the required information is complete, review the selected company, location, shift, requirement, filled count, and remarks. Then click Submit Head Count to confirm the update.",
        styles["SectionText"],
    ))
    image_block(story, SCREENSHOT_DIR / "07-submission-success-popup.png", "Figure 6: Submission confirmation popup after a successful headcount entry.")
    story.append(Paragraph(
        "After submission, a confirmation message appears. Verify that the message confirms successful submission before continuing with other work. If the confirmation does not appear, review the form and resubmit only after checking the values.",
        styles["SectionText"],
    ))

    story.append(Paragraph("8. Review Previous Entries and Analytics", styles["SectionTitle"]))
    story.append(Paragraph(
        "The coordinator can review previous submissions and daily analytics to confirm the latest updates, track patterns, and avoid duplicate or incorrect entries.",
        styles["SectionText"],
    ))
    image_block(story, SCREENSHOT_DIR / "06-coordinator-analytics-and-previous-entries.png", "Figure 7: Previous entries and analytics panel used to verify historical headcount reporting.")
    add_list(story, [
        "Open My Previous Entries to review submitted records.",
        "Check the requirement and filled count for the selected date.",
        "Verify any remarks entered for the day.",
        "Review the analytics panel to understand vacancy or utilization trends.",
    ])
    story.append(Paragraph(
        "Use the history panel before and after submission to ensure the information submitted is complete, consistent, and correct.",
        styles["SectionText"],
    ))

    story.append(Paragraph("9. Support and Escalation", styles["SectionTitle"]))
    story.append(Paragraph(
        "If the coordinator cannot access the system, the assigned company or location is incorrect, the form does not submit, or the data is unclear, contact Head Office immediately.",
        styles["SectionText"],
    ))
    story.append(Paragraph(
        "Head Office support contact: Mr. Pranav Phalke<br/><br/>Report these issues as soon as possible: login failure, forgotten password, incorrect company or location, missing scheme selection, wrong headcount figures, or unsuccessful submission.",
        styles["InfoNote"],
    ))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "This coordinator user manual is intended only for RTHC Coordinator users. It should be used with the current RTHC application and the daily headcount workflow for assigned company and location reporting.",
        styles["SectionText"],
    ))

    return story


def add_page_header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(brand_blue)
    canvas.rect(0, 0, A4[0], 18 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, 5 * mm, "RTHC | Real-Time Head Count")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 18 * mm, 5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="RTHC Coordinator User Manual",
        author="DMCFS Pvt. Ltd.",
    )
    doc.build(build_story(), onFirstPage=add_page_header, onLaterPages=add_page_header)


if __name__ == "__main__":
    build_pdf()
    print(f"PDF generated: {OUTPUT_PATH}")
