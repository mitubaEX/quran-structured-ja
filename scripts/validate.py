#!/usr/bin/env python3

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CHAPTERS_DIR = DATA_DIR / "chapters"
INDEX_PATH = DATA_DIR / "index.json"


class ValidationError(Exception):
    pass


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValidationError(f"{path}: JSON parse error: {exc}") from exc


def expect_type(value, expected_type, path: str):
    if not isinstance(value, expected_type):
        raise ValidationError(f"{path}: expected {expected_type.__name__}, got {type(value).__name__}")


def expect_non_empty_string(value, path: str):
    expect_type(value, str, path)
    if not value.strip():
        raise ValidationError(f"{path}: string must not be empty")


def expect_string_list(value, path: str, allow_empty: bool):
    expect_type(value, list, path)
    if not allow_empty and not value:
        raise ValidationError(f"{path}: list must not be empty")
    for index, item in enumerate(value):
        expect_non_empty_string(item, f"{path}[{index}]")


def validate_ayah(ayah_data, index: int):
    path = f"ayahs[{index}]"
    required = ["ayah", "literal_ja", "modern_ja", "summary_ja", "themes", "notes", "caution"]
    optional = ["arabic", "romanized"]
    allowed = set(required + optional)

    expect_type(ayah_data, dict, path)
    unknown = set(ayah_data.keys()) - allowed
    if unknown:
        raise ValidationError(f"{path}: unknown keys: {sorted(unknown)}")

    for key in required:
        if key not in ayah_data:
            raise ValidationError(f"{path}: missing required key: {key}")

    expect_type(ayah_data["ayah"], int, f"{path}.ayah")
    if ayah_data["ayah"] < 1:
        raise ValidationError(f"{path}.ayah: must be >= 1")

    for key in ["literal_ja", "modern_ja", "summary_ja"]:
        expect_non_empty_string(ayah_data[key], f"{path}.{key}")

    for key in optional:
        if key in ayah_data:
            expect_non_empty_string(ayah_data[key], f"{path}.{key}")

    expect_string_list(ayah_data["themes"], f"{path}.themes", allow_empty=False)
    expect_string_list(ayah_data["notes"], f"{path}.notes", allow_empty=True)
    expect_string_list(ayah_data["caution"], f"{path}.caution", allow_empty=True)


def validate_surah(path: Path):
    data = load_json(path)
    required = [
        "surah", "chapter_name_ar", "chapter_name_ja", "chapter_name_en", "traditional_order",
        "ayah_count_total", "ayah_count_included", "is_partial", "approximate_theme", "summary_ja", "ayahs"
    ]
    optional = ["coverage_note"]
    allowed = set(required + optional)

    expect_type(data, dict, str(path))
    unknown = set(data.keys()) - allowed
    if unknown:
        raise ValidationError(f"{path}: unknown keys: {sorted(unknown)}")

    for key in required:
        if key not in data:
            raise ValidationError(f"{path}: missing required key: {key}")

    for key in ["surah", "traditional_order", "ayah_count_total", "ayah_count_included"]:
        expect_type(data[key], int, f"{path}.{key}")
        if data[key] < 1:
            raise ValidationError(f"{path}.{key}: must be >= 1")

    expect_type(data["is_partial"], bool, f"{path}.is_partial")

    for key in ["chapter_name_ar", "chapter_name_ja", "chapter_name_en", "approximate_theme", "summary_ja"]:
        expect_non_empty_string(data[key], f"{path}.{key}")

    if data.get("coverage_note") is not None:
        expect_non_empty_string(data["coverage_note"], f"{path}.coverage_note")

    expect_type(data["ayahs"], list, f"{path}.ayahs")
    if not data["ayahs"]:
        raise ValidationError(f"{path}.ayahs: must not be empty")

    if len(data["ayahs"]) != data["ayah_count_included"]:
        raise ValidationError(f"{path}: ayah_count_included does not match actual ayah entries")
    if data["ayah_count_included"] > data["ayah_count_total"]:
        raise ValidationError(f"{path}: ayah_count_included must be <= ayah_count_total")
    if data["is_partial"] and data["ayah_count_included"] == data["ayah_count_total"]:
        raise ValidationError(f"{path}: is_partial is true but included and total counts are equal")
    if (not data["is_partial"]) and data["ayah_count_included"] != data["ayah_count_total"]:
        raise ValidationError(f"{path}: is_partial is false but included and total counts differ")

    previous_ayah = 0
    for index, ayah_data in enumerate(data["ayahs"]):
        validate_ayah(ayah_data, index)
        ayah_number = ayah_data["ayah"]
        if ayah_number <= previous_ayah:
            raise ValidationError(f"{path}.ayahs[{index}].ayah: ayah numbers must be strictly increasing")
        previous_ayah = ayah_number

    return data


def validate_index():
    index_data = load_json(INDEX_PATH)
    required = ["project", "included_surahs"]
    allowed = set(required)

    expect_type(index_data, dict, "index.json")
    unknown = set(index_data.keys()) - allowed
    if unknown:
        raise ValidationError(f"index.json: unknown keys: {sorted(unknown)}")

    for key in required:
        if key not in index_data:
            raise ValidationError(f"index.json: missing required key: {key}")

    project = index_data["project"]
    expect_type(project, dict, "index.json.project")
    for key in ["title", "language", "version"]:
        if key not in project:
            raise ValidationError(f"index.json.project: missing required key: {key}")
        expect_non_empty_string(project[key], f"index.json.project.{key}")
    if "policy_summary" not in project:
        raise ValidationError("index.json.project: missing required key: policy_summary")
    expect_string_list(project["policy_summary"], "index.json.project.policy_summary", allow_empty=False)

    included = index_data["included_surahs"]
    expect_type(included, list, "index.json.included_surahs")
    if not included:
        raise ValidationError("index.json.included_surahs: must not be empty")

    seen_surahs = set()
    for idx, item in enumerate(included):
        path = f"index.json.included_surahs[{idx}]"
        expect_type(item, dict, path)
        for key in ["surah", "chapter_name_ar", "chapter_name_ja", "chapter_name_en", "ayah_count_total", "ayah_count_included", "is_partial", "file"]:
            if key not in item:
                raise ValidationError(f"{path}: missing required key: {key}")
        for key in ["surah", "ayah_count_total", "ayah_count_included"]:
            expect_type(item[key], int, f"{path}.{key}")
        expect_type(item["is_partial"], bool, f"{path}.is_partial")
        if item["surah"] in seen_surahs:
            raise ValidationError(f"{path}.surah: duplicate surah number {item['surah']}")
        seen_surahs.add(item["surah"])
        for key in ["chapter_name_ar", "chapter_name_ja", "chapter_name_en", "file"]:
            expect_non_empty_string(item[key], f"{path}.{key}")

        chapter_path = ROOT / item["file"]
        if not chapter_path.exists():
            raise ValidationError(f"{path}.file: referenced file does not exist: {chapter_path}")

        chapter_data = validate_surah(chapter_path)
        if chapter_data["surah"] != item["surah"]:
            raise ValidationError(f"{path}: surah mismatch between index and chapter file")
        for key in ["chapter_name_ar", "chapter_name_ja", "chapter_name_en", "ayah_count_total", "ayah_count_included", "is_partial"]:
            if chapter_data[key] != item[key]:
                raise ValidationError(f"{path}: {key} mismatch between index and chapter file")


def main():
    try:
        validate_index()
    except ValidationError as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        return 1

    chapter_files = sorted(CHAPTERS_DIR.glob("*.json"))
    if not chapter_files:
        print("Validation failed: no chapter files found", file=sys.stderr)
        return 1

    print(f"Validation passed: {len(chapter_files)} chapter file(s) checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
