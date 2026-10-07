"""Run owner-scoped retrieval metrics for a reviewed evaluation/questions.json."""
import getpass
import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def request_json(url: str, body: dict, cookie: str | None = None) -> tuple[dict, str | None]:
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read()), response.headers.get("Set-Cookie")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"API returned {error.code}: {detail}") from error


def main() -> None:
    api_url = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
    dataset_path = Path(__file__).with_name("questions.json")
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    cases = dataset.get("questions", [])
    if not cases:
        raise SystemExit("No labeled cases found. Add reviewed questions to evaluation/questions.json first.")
    email = input("Account email: ").strip()
    password = getpass.getpass("Account password: ")
    _, cookie_header = request_json(f"{api_url}/api/auth/login", {"email": email, "password": password})
    if not cookie_header:
        raise SystemExit("Login did not return a session cookie.")
    cookie = cookie_header.split(";", 1)[0]
    report, _ = request_json(f"{api_url}/api/evaluation/run", {"cases": cases, "top_k": 5}, cookie)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
