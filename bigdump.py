import xml.etree.ElementTree as ET

tree = ET.parse("bigdump.xml")
root = tree.getroot()

all_contributors = {}
all_pages = {}
for page in root:
    if page.tag.endswith("page"):
        contribs = set([])
        for elem in page:
            if elem.tag.endswith("title"):
                page_title = elem.text
            if elem.tag.endswith("revision"):
                for contrib in elem:
                    if contrib.tag.endswith("contributor"):
                        for user in contrib:
                            if user.tag.endswith("username"):
                                contribs.add(user.text)
                                all_contributors[user.text] = set([])
        all_pages[page_title] = contribs

for page_title, contributors in all_pages.items():
    for contributor in contributors:
        all_contributors[contributor].add(page_title)

for contributor in sorted(all_contributors.keys()):
    pages = all_contributors[contributor]
    show = False
    for page in pages:
        if not page.startswith("User") and not page.startswith("Talk"):
            show = True
    if show:
        print(contributor + " contributed to " + str(len(pages)) + " page(s)")
        for page in sorted(pages):
            print("  " + page)
