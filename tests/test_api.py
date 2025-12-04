from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister():
    email = "pytest-user@example.com"
    activity = "Chess Club"

    # Ensure email not present (clean state)
    data = client.get("/activities").json()
    if email in data[activity]["participants"]:
        client.delete(f"/activities/{activity}/unregister?email={email}")

    # Sign up
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    data = client.get("/activities").json()
    assert email in data[activity]["participants"]

    # Unregister
    r2 = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert r2.status_code == 200

    data = client.get("/activities").json()
    assert email not in data[activity]["participants"]


def test_unregister_not_registered():
    email = "not-registered@example.com"
    activity = "Chess Club"

    # Ensure not registered
    data = client.get("/activities").json()
    if email in data[activity]["participants"]:
        client.delete(f"/activities/{activity}/unregister?email={email}")

    r = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert r.status_code == 404
