import json
from typing import List, Dict, Any
import copy
import sys
from pathlib import Path


def merge_json_lists(json_a: List[Dict], json_b: List[Dict]) -> List[Dict]:
    """
    Merges two JSON lists while following these rules:
    - Adds entries from A that don't exist in B
    - Overwrites simple properties for existing entries
    - Extends lists for existing entries
    - Sorts object keys alphabetically
    - Sorts root list by string values

    Args:
        json_a: Source JSON list to merge from
        json_b: Target JSON list to merge into

    Returns:
        List[Dict]: Merged and sorted JSON list
    """
    # Create a deep copy of json_b to avoid modifying the original
    result = copy.deepcopy(json_b)

    # Helper function to sort dictionary keys
    def sort_dict(d: Dict) -> Dict:
        return {k: sort_dict(v) if isinstance(v, dict) else v
                for k, v in sorted(d.items())}

    # Helper function to merge two dictionaries
    def merge_dicts(source: Dict, target: Dict) -> Dict:
        result = copy.deepcopy(target)

        for key, value in source.items():
            if key not in result:
                result[key] = copy.deepcopy(value)
            else:
                if isinstance(value, list) and isinstance(result[key], list):
                    # Extend lists
                    result[key].extend(copy.deepcopy(value))
                elif isinstance(value, dict) and isinstance(result[key], dict):
                    # Recursively merge nested dictionaries
                    result[key] = merge_dicts(value, result[key])
                else:
                    # Overwrite simple properties
                    result[key] = copy.deepcopy(value)

        return sort_dict(result)

    # Process each item from json_a
    for item_a in json_a:
        # Try to find matching item in result
        found = False
        for i, item_b in enumerate(result):
            if item_b.keys() == item_a.keys() and all(
                    not isinstance(item_b[k], (list, dict)) and item_b[k] == item_a[k]
                    for k in item_b.keys()
            ):
                # Merge matching items
                result[i] = merge_dicts(item_a, item_b)
                found = True
                break

        if not found:
            # Add new item if no match found
            result.append(copy.deepcopy(sort_dict(item_a)))

    # Sort the root list based on string values
    def get_sort_key(item):
        # Create a tuple of string values for sorting
        return tuple(str(v) for k, v in sorted(item.items())
                     if isinstance(v, (str, int, float, bool)))

    return sorted(result, key=get_sort_key)


def merge_json_files(source_path: str, target_path: str) -> None:
    """
    Loads JSON from source and target files, merges them, and saves the result back to the target file.

    Args:
        source_path: Path to the source JSON file (file A)
        target_path: Path to the target JSON file (file B) where the merged result will be saved

    Raises:
        FileNotFoundError: If either file doesn't exist
        json.JSONDecodeError: If either file contains invalid JSON
        TypeError: If the root structure of either file is not a list
    """
    # Convert to Path objects for better path handling
    source_path = Path(source_path)
    target_path = Path(target_path)

    # Verify files exist
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")
    if not target_path.exists():
        raise FileNotFoundError(f"Target file not found: {target_path}")

    try:
        # Load source JSON (A)
        with source_path.open('r', encoding='utf-8') as f:
            json_a = json.load(f)

        # Load target JSON (B)
        with target_path.open('r', encoding='utf-8') as f:
            json_b = json.load(f)

        # Verify both are lists
        if not isinstance(json_a, list) or not isinstance(json_b, list):
            raise TypeError("Both JSON files must have a list as their root structure")

        # Merge the JSONs
        merged_json = merge_json_lists(json_a, json_b)

        # Save the merged result back to the target file
        with target_path.open('w', encoding='utf-8') as f:
            json.dump(merged_json, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add newline at end of file

    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(f"Invalid JSON in {'source' if e.doc_id == 0 else 'target'} file: {str(e)}", e.doc, e.pos)


json_source_file = "nativeImage/reflect-config.json"
json_target_file = "../src/main/resources/META-INF/native-image/reflect-config.json"
merge_json_files(json_source_file, json_target_file)

