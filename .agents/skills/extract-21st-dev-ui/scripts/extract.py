#!/usr/bin/env python3
"""
extract.py — 21st.dev bundle 逆向提取辅助脚本

配合 .agents/skills/extract-21st-dev-ui/SKILL.md 使用。
bundle 里的 JS 是压缩但未深度混淆的：变量名缩短（s/p/rt/$g），
但字符串字面量（className、SVG path、props）原样保留，且常有
`s(sym,"OriginalName")` 命名辅助调用保留原名。

本脚本把 SKILL.md 步骤 3 中反复手写的四类操作固化为子命令：

    names   扫描 `s(sym,"Name")` 模式，输出 压缩符号 → 原名 映射表
    find    用 anchor 字符串定位代码片段（向前找最近的 `function`）
    fn      用平衡括号提取整个函数体（自动跳过参数解构陷阱）
    jsx     解析一段代码里的所有 F.jsx("tag",{...}) 节点属性

用法见每个子命令的 --help，或在 SKILL.md 步骤 3 查阅示例。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 核心：平衡括号（处理字符串 / 转义 / 模板字符串）
# ---------------------------------------------------------------------------
def balanced_from(s: str, open_brace_idx: int) -> int:
    """
    从某个 `{` 下标开始，返回与之配对的 `}` 下标。
    处理 "...' / '...' / `...` 字符串与反斜杠转义，避免被字符串里的括号干扰。

    注意：必须从「函数体的 {」开始（即 `){` 之后那个），不能从参数解构
    `{src,...}` 的第一个 `{` 开始 —— 否则会在解构对象的 `}` 处提前停止。
    """
    depth = 0
    j = open_brace_idx
    instr: str | None = None
    esc = False
    while j < len(s):
        c = s[j]
        if instr:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == instr:
                instr = None
        else:
            if c in "\"'`":
                instr = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return j
        j += 1
    return -1


def find_function_body(s: str, name: str) -> tuple[int, int] | None:
    """
    定位 `function <name>(...){...}`，返回 (函数起始下标, 函数体结束 `}` 下标)。
    自动跳过参数列表 / 参数解构，从函数体的 `{` 开始做平衡。
    支持 `function name(` 与 `const name = (` / `const name = function(` 等变体。
    """
    patterns = [
        rf"function\s+{re.escape(name)}\s*\(",
        rf"\b{name}\s*=\s*function\s*\(",
        rf"\b{name}\s*=\s*\(",
        rf"\b{name}\s*=\s*\w+\s*\(",  # arrow / forward
    ]
    for pat in patterns:
        m = re.search(pat, s)
        if not m:
            continue
        fn_start = m.start()
        # 找到 m 之后第一个 '{'（跳过参数列表 / 解构 / 箭头）
        body_open = s.find("{", m.end())
        if body_open == -1:
            continue
        # 确认这个 { 前面是 ) 或 =>（函数体的 {），避免落到解构对象的 {
        prev = s[body_open - 1]
        if prev not in ")=":
            # 可能是箭头函数带解构：( {a,b} ) => {} —— 继续找下一个 {
            body_open2 = s.find("{", body_open + 1)
            if body_open2 != -1 and s[body_open2 - 1] in ")]=>":
                body_open = body_open2
        end = balanced_from(s, body_open)
        if end != -1:
            return (fn_start, end)
    return None


# ---------------------------------------------------------------------------
# 子命令：names —— 命名辅助函数映射表
# ---------------------------------------------------------------------------
NAME_HINT = re.compile(
    # 匹配 sym,"Name") 或 sym, "Name")，Name 以大写字母或 use 开头（组件/hook 惯例）
    r'(\b[\w$]{1,5})\s*,\s*"((?:use[A-Z][\w$]*|[A-Z][\w$]*|cn|cx|clsx))"\s*\)'
)


def cmd_names(args: argparse.Namespace) -> int:
    s = Path(args.bundle).read_text(encoding="utf-8", errors="ignore")
    seen: dict[str, str] = {}
    for m in NAME_HINT.finditer(s):
        sym, name = m.group(1), m.group(2)
        if sym in {"if", "for", "while", "return", "switch"}:
            continue
        seen[sym] = name
    if not seen:
        print("(未发现 `sym,\"Name\"` 命名辅助模式 —— 部分 bundle 完全没有，需靠 registry 映射表还原)",
              file=sys.stderr)
        return 1
    width = max(len(sym) for sym in seen)
    for sym, name in seen.items():
        print(f"{sym:<{width}}  →  {name}")
    return 0


# ---------------------------------------------------------------------------
# 子命令：find —— anchor 定位
# ---------------------------------------------------------------------------
def cmd_find(args: argparse.Namespace) -> int:
    s = Path(args.bundle).read_text(encoding="utf-8", errors="ignore")
    anchor = args.anchor
    idx = s.find(anchor)
    if idx == -1:
        print(f"anchor {anchor!r} 未找到", file=sys.stderr)
        return 1
    count = s.count(anchor)
    # 向前找最近的 function 定义起点
    fn_idx = s.rfind("function ", 0, idx)
    start = fn_idx if fn_idx != -1 else max(0, idx - args.before)
    end = min(len(s), idx + args.after)
    print(f"# anchor {anchor!r} 出现 {count} 次，首次 @ {idx}")
    if fn_idx != -1:
        fn_name = _read_fn_name(s, fn_idx)
        print(f"# 最近 function: {fn_name} @ {fn_idx} (offset {idx - fn_idx})")
    print("─" * 60)
    print(s[start:end])
    return 0


def _read_fn_name(s: str, fn_idx: int) -> str:
    m = re.match(r"function\s+([\w$]+)", s[fn_idx:])
    return m.group(1) if m else "?"


# ---------------------------------------------------------------------------
# 子命令：fn —— 提取整个函数体
# ---------------------------------------------------------------------------
JSX_CALL = re.compile(r'(\w{1,4})\.jsx(s)?\s*\(\s*"([^"]+)"\s*,')


def cmd_fn(args: argparse.Namespace) -> int:
    s = Path(args.bundle).read_text(encoding="utf-8", errors="ignore")
    target = args.name
    loc = find_function_body(s, target)
    if loc is None:
        # 退而求其次：当成 anchor，定位后向前找 function
        idx = s.find(target)
        if idx == -1:
            print(f"找不到函数 {target!r}，也不是有效 anchor", file=sys.stderr)
            return 1
        fn_idx = s.rfind("function ", 0, idx)
        if fn_idx == -1:
            print(f"anchor {target!r} 前方未找到 function 定义", file=sys.stderr)
            return 1
        fn_name = _read_fn_name(s, fn_idx)
        print(f"# anchor 命中，实际函数: {fn_name}", file=sys.stderr)
        loc = find_function_body(s, fn_name)
        if loc is None:
            print("定位函数体失败", file=sys.stderr)
            return 1
    start, end = loc
    body = s[start : end + 1]
    print(body)
    if args.stats:
        print(f"\n# 长度 {len(body)} 字符", file=sys.stderr)
    return 0


# ---------------------------------------------------------------------------
# 子命令：jsx —— 解析 JSX 节点属性
# ---------------------------------------------------------------------------
def cmd_jsx(args: argparse.Namespace) -> int:
    if args.input:
        code = Path(args.input).read_text(encoding="utf-8", errors="ignore")
    else:
        code = sys.stdin.read()
    if not code.strip():
        print("无输入（用 --input FILE 或通过管道传入代码）", file=sys.stderr)
        return 1
    count = 0
    for m in JSX_CALL.finditer(code):
        runtime, is_fragment, tag = m.group(1), m.group(2), m.group(3)
        po = code.find("{", m.end() - 1)
        if po == -1:
            continue
        pc = balanced_from(code, po)
        if pc == -1:
            continue
        # 只取 children: 之前的直属属性
        head = code[po + 1 : pc]
        head = head.split("children:", 1)[0]
        attrs = re.findall(r'([a-zA-Z][\w-]*):\s*"([^"]*)"', head)
        # 动态布尔/表达式属性（如 aria-hidden:!0 / fill:!0）
        dyn = re.findall(r'([a-zA-Z][\w-]*):\s*(!?[\w.]+)', head)
        print(f"<{tag}>")
        for k, v in attrs:
            print(f"  {k}={v!r}")
        for k, v in dyn:
            if (k, v) in attrs:
                continue
            print(f"  {k}={{{v}}}")
        count += 1
    if args.stats:
        print(f"\n# 共 {count} 个 JSX 节点", file=sys.stderr)
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="extract.py",
        description="21st.dev bundle 逆向提取辅助（详见 SKILL.md 步骤 3）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
示例：
  # 1. 先看 bundle 里保留了哪些原名（识别压缩符号语义）
  python3 extract.py bundle.html names

  # 2. 用组件独有的 className / SVG id / props 名定位代码
  python3 extract.py bundle.html find "roundedCorners" --after 4500

  # 3. 提取整个函数体（支持函数名或 anchor）
  python3 extract.py bundle.html fn sM
  python3 extract.py bundle.html fn lensStrength

  # 4. 解析函数体里的所有 JSX 节点属性（避免固定字符窗口跨节点）
  python3 extract.py bundle.html fn sM > /tmp/fn.txt
  python3 extract.py bundle.html jsx --input /tmp/fn.txt
""",
    )
    p.add_argument("bundle", nargs="?", help="bundle HTML 路径（jsx 子命令可省略）")
    sub = p.add_subparsers(dest="cmd", required=True, metavar="<command>")

    sub.add_parser("names", help="扫描 sym,\"Name\" 映射表").set_defaults(func=cmd_names)

    pf = sub.add_parser("find", help="用 anchor 字符串定位代码片段")
    pf.add_argument("anchor", help="组件独有的特征字符串")
    pf.add_argument("--before", type=int, default=80, help="anchor 前打印字符数")
    pf.add_argument("--after", type=int, default=600, help="anchor 后打印字符数")
    pf.set_defaults(func=cmd_find)

    pfn = sub.add_parser("fn", help="平衡括号提取整个函数体")
    pfn.add_argument("name", help="函数名（如 sM）或 anchor 字符串")
    pfn.add_argument("--stats", action="store_true", help="在 stderr 输出长度统计")
    pfn.set_defaults(func=cmd_fn)

    pj = sub.add_parser("jsx", help="解析代码中所有 F.jsx(\"tag\",{...}) 的属性")
    pj.add_argument("--input", help="代码文件路径；省略则读 stdin")
    pj.add_argument("--stats", action="store_true", help="在 stderr 输出节点数")
    pj.set_defaults(func=cmd_jsx)

    return p


def main() -> int:
    # 允许 `extract.py names bundle.html` 与 `extract.py bundle.html names` 两种顺序
    argv = sys.argv[1:]
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "bundle", None) and args.cmd not in ("jsx",):
        # jsx 不需要 bundle
        if args.cmd == "names" or args.cmd == "find" or args.cmd == "fn":
            parser.error("需要 bundle 文件路径")
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
