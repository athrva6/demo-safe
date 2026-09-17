from app.detection import find_sensitive


def blocks(text):
    words = text.split()
    return [{"Id":"line", "BlockType":"LINE", "Text":text, "Geometry":{"BoundingBox":{"Left":.1,"Top":.2,"Width":.8,"Height":.1}}, "Relationships":[{"Type":"CHILD","Ids":[str(i) for i in range(len(words))]}]}] + [
        {"Id":str(i), "BlockType":"WORD", "Text":word, "Geometry":{"BoundingBox":{"Left":.1+i*.2,"Top":.2,"Width":.18,"Height":.1}}}
        for i, word in enumerate(words)
    ]


def test_email_maps_to_ocr_word_and_never_returns_raw_secret():
    findings = find_sensitive(blocks("Contact: alex@example.com"))
    assert len(findings) == 1
    assert findings[0]["label"] == "Email address"
    assert abs(findings[0]["box"]["x"] - .3) < .0001
    assert "alex@example.com" not in str(findings)


def test_labelled_credential_masks_value_word():
    findings = find_sensitive(blocks("API_KEY = fictional-secret-value"))
    assert len(findings) == 1
    assert abs(findings[0]["box"]["x"] - .5) < .0001


def test_account_number_not_mislabelled_as_credential():
    assert find_sensitive(blocks("Account: 123456789012")) == []


def test_missing_word_mapping_falls_back_to_line():
    line = blocks("Email: alex@example.com")[0]
    line["Relationships"] = []
    findings = find_sensitive([line])
    assert findings[0]["box"]["x"] == .1
    assert findings[0]["box"]["width"] == .8
