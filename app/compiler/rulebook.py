import re
from typing import Any, Dict, List, Optional


class RulebookCompiler:
    """Parses business-authored Markdown rulebooks into normalized, executable rules[cite: 1, 7]."""

    @classmethod
    def parse_markdown(cls, markdown_content: str) -> Dict[str, Any]:
        """
        Parses Markdown sections into a structured rule model[cite: 1]:
        - ## Field transformations
        - ## Value crosswalks
        - ## Entity joins
        - ## Validation rules
        - ## Evidence and intent
        - ## Open questions
        """
        result = {
            "fieldRules": [],
            "crosswalks": [],
            "joins": [],
            "validationRules": [],
            "evidence": [],
            "openQuestions": []
        }

        if not markdown_content:
            return result

        sections = cls._split_sections(markdown_content)

        for title, body in sections.items():
            title_lower = title.lower().strip()
            
            if "field transformation" in title_lower:
                result["fieldRules"] = cls._parse_field_transformations(body)
            elif "value crosswalk" in title_lower:
                result["crosswalks"] = cls._parse_value_crosswalks(body)
            elif "entity join" in title_lower:
                result["joins"] = cls._parse_entity_joins(body)
            elif "validation rule" in title_lower:
                result["validationRules"] = cls._parse_validation_rules(body)
            elif "evidence" in title_lower:
                result["evidence"] = cls._parse_bullet_points(body)
            elif "open question" in title_lower:
                result["openQuestions"] = cls._parse_bullet_points(body)

        return result

    @classmethod
    def compile_rulebook(
        cls,
        markdown_content: str,
        base_business_rules: Optional[Dict[str, Any]] = None,
        base_validations: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compiles the Markdown rulebook and overlays it on top of baseline JSON knowledge[cite: 1].
        Precedence: Saved Markdown override > Template rulebook > Business Rules JSON[cite: 1, 7].
        """
        parsed = cls.parse_markdown(markdown_content)

        base_br = base_business_rules or {}
        base_val = base_validations or {}

        # Merge Field Rules (Markdown takes precedence)
        field_rules_map = {f"{r['entity']}.{r['targetField']}": r for r in base_br.get("fieldRules", [])}
        for md_rule in parsed["fieldRules"]:
            key = f"{md_rule['entity']}.{md_rule['targetField']}"
            field_rules_map[key] = md_rule

        # Merge Crosswalks
        crosswalk_map = {f"{c['sourceFile']}.{c['targetField']}": c for c in base_br.get("crosswalks", [])}
        for md_cw in parsed["crosswalks"]:
            key = f"{md_cw['sourceFile']}.{md_cw['targetField']}"
            crosswalk_map[key] = md_cw

        # Merge Joins
        join_map = {f"{j['leftFile']}->{j['rightFile']}": j for j in base_br.get("joins", [])}
        for md_join in parsed["joins"]:
            key = f"{md_join['leftFile']}->{md_join['rightFile']}"
            join_map[key] = md_join

        # Merge Validations
        val_map = {f"{v['entity']}.{v['fileName']}.{v['checkType']}": v for v in base_val.get("validationRules", [])}
        for md_val in parsed["validationRules"]:
            key = f"{md_val['entity']}.{md_val['fileName']}.{md_val['checkType']}"
            val_map[key] = md_val

        return {
            "fieldRules": list(field_rules_map.values()),
            "crosswalks": list(crosswalk_map.values()),
            "joins": list(join_map.values()),
            "validationRules": list(val_map.values()),
            "evidence": parsed["evidence"] or base_br.get("evidence", []),
            "openQuestions": parsed["openQuestions"] or base_br.get("openQuestions", [])
        }

    @staticmethod
    def _split_sections(content: str) -> Dict[str, str]:
        sections = {}
        current_title = "header"
        current_lines = []

        for line in content.splitlines():
            if line.startswith("## "):
                if current_lines:
                    sections[current_title] = "\n".join(current_lines)
                    current_lines = []
                current_title = line[3:].strip()
            else:
                current_lines.append(line)

        if current_lines:
            sections[current_title] = "\n".join(current_lines)

        return sections

    @classmethod
    def _parse_table(cls, markdown_body: str) -> List[Dict[str, str]]:
        """Parses a Markdown table into a list of row dicts with snake_case keys[cite: 1]."""
        lines = [line.strip() for line in markdown_body.splitlines() if line.strip().startswith("|")]
        if len(lines) < 2:
            return []

        # Extract headers and normalize to lower snake_case[cite: 1]
        raw_headers = [h.strip() for h in lines[0].split("|")[1:-1]]
        headers = [re.sub(r"\s+", "_", h.lower()) for h in raw_headers]

        rows = []
        # Skip header and separator lines
        for line in lines[2:]:
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) == len(headers):
                rows.append(dict(zip(headers, cells)))

        return rows

    @classmethod
    def _parse_field_transformations(cls, body: str) -> List[Dict[str, Any]]:
        rows = cls._parse_table(body)
        rules = []
        for r in rows:
            rules.append({
                "entity": r.get("entity", ""),
                "targetField": r.get("target_field", ""),
                "sourceFile": r.get("source_file", ""),
                "expression": r.get("expression", "")
            })
        return rules

    @classmethod
    def _parse_value_crosswalks(cls, body: str) -> List[Dict[str, Any]]:
        rows = cls._parse_table(body)
        grouped = {}
        for r in rows:
            sf = r.get("source_file", "")
            tf = r.get("target_field", "")
            sv = r.get("source_value", "")
            tv = r.get("target_value", "")

            key = (sf, tf)
            if key not in grouped:
                grouped[key] = {
                    "sourceFile": sf,
                    "targetField": tf,
                    "mappings": {}
                }
            grouped[key]["mappings"][sv] = tv

        return list(grouped.values())

    @classmethod
    def _parse_entity_joins(cls, body: str) -> List[Dict[str, Any]]:
        rows = cls._parse_table(body)
        joins = []
        for r in rows:
            joins.append({
                "leftFile": r.get("left_file", ""),
                "leftField": r.get("left_field", ""),
                "rightFile": r.get("right_file", ""),
                "rightField": r.get("right_field", ""),
                "joinType": r.get("join_type", "LEFT").upper()
            })
        return joins

    @classmethod
    def _parse_validation_rules(cls, body: str) -> List[Dict[str, Any]]:
        rows = cls._parse_table(body)
        validations = []
        for r in rows:
            validations.append({
                "entity": r.get("entity", ""),
                "fileName": r.get("file", r.get("filename", "")),
                "checkType": r.get("check_type", "REQUIRED").upper(),
                "scope": r.get("scope", ""),
                "ruleText": r.get("rule_text", "")
            })
        return validations

    @staticmethod
    def _parse_bullet_points(body: str) -> List[str]:
        bullets = []
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                bullets.append(line[2:].strip())
        return bullets