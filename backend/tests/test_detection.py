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


def test_aws_account_id_is_suggested_without_exposing_value():
    findings = find_sensitive(blocks("Account: 123456789012"))
    assert findings[0]["label"] == "AWS account ID"
    assert "123456789012" not in str(findings)


def test_aws_terminal_identifiers_are_suggested():
    text = "i-02f9191f6ccee79c4 52.66.230.45 subnet-842303a876f7e6583 sg-0e1e4a6a09cb3a740"
    findings = find_sensitive(blocks(text))
    labels = [finding["label"] for finding in findings]
    assert labels.count("AWS resource identifier") == 3
    assert "Possible IP address" in labels


def test_cli_key_name_value_is_suggested():
    findings = find_sensitive(blocks("aws ec2 run-instances --key-name my-ec2-key"))
    assert findings[0]["label"] == "SSH key name"
    assert "my-ec2-key" not in str(findings)


def test_missing_word_mapping_falls_back_to_line():
    line = blocks("Email: alex@example.com")[0]
    line["Relationships"] = []
    findings = find_sensitive([line])
    assert findings[0]["box"]["x"] == .1
    assert findings[0]["box"]["width"] == .8
