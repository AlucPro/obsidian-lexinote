import type { DictionaryPathRule } from "../types";

export function normalizeDictionaryRulePath(path: string): string {
  const normalizedPath = path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!normalizedPath) {
    return "";
  }

  const pathSegments = normalizedPath.split("/");

  if (pathSegments.some((segment) => segment === "." || segment === "..")) {
    return "";
  }

  return normalizedPath;
}

export function isDictionaryEnabledForPath(
  filePath: string,
  rules: DictionaryPathRule[]
): boolean {
  const normalizedFilePath = normalizeDictionaryRulePath(filePath);
  const validRules = rules
    .map((rule) => ({
      ...rule,
      path: normalizeDictionaryRulePath(rule.path)
    }))
    .filter(
      (rule) =>
        rule.path &&
        (rule.mode === "enabled" || rule.mode === "disabled")
    );

  if (!normalizedFilePath || validRules.length === 0) {
    return true;
  }

  const hasEnabledRule = validRules.some((rule) => rule.mode === "enabled");
  const matchingRules = validRules.filter((rule) =>
    doesRuleMatchFile(normalizedFilePath, rule.path)
  );

  if (matchingRules.length === 0) {
    return !hasEnabledRule;
  }

  matchingRules.sort((left, right) => {
    if (left.path.length !== right.path.length) {
      return right.path.length - left.path.length;
    }

    if (left.mode === right.mode) {
      return 0;
    }

    return left.mode === "disabled" ? -1 : 1;
  });

  return matchingRules[0].mode === "enabled";
}

function doesRuleMatchFile(filePath: string, rulePath: string): boolean {
  return filePath === rulePath || filePath.startsWith(`${rulePath}/`);
}
