import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

/// 玻璃风格文本输入框，封装 [GlassTextField]，替代 Material [TextField]。
///
/// 兼容 Material 习惯：[hintText]/[labelText] 会被映射到底层的 [placeholder]。
/// 自带透明 [Material] 祖先（GlassScaffold/GlassDialog 内部无 Material 祖先）。
class MiraTextField extends StatelessWidget {
  const MiraTextField({
    super.key,
    this.controller,
    this.focusNode,
    this.hintText,
    this.labelText,
    this.placeholder,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.enabled = true,
    this.readOnly = false,
    this.autofocus = false,
    this.onChanged,
    this.onSubmitted,
    this.inputFormatters,
  });

  final TextEditingController? controller;
  final FocusNode? focusNode;

  /// 占位文字；[placeholder] / [hintText] 都映射到这里。
  final String? hintText;
  final String? labelText;
  final String? placeholder;

  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final VoidCallback? onSuffixTap;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int maxLines;
  final int? minLines;
  final int? maxLength;
  final bool enabled;
  final bool readOnly;
  final bool autofocus;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final List<TextInputFormatter>? inputFormatters;

  String? get _placeholder => placeholder ?? hintText ?? labelText;

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GlassTextField(
        controller: controller,
        focusNode: focusNode,
        placeholder: _placeholder,
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
        onSuffixTap: onSuffixTap,
        obscureText: obscureText,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        maxLines: maxLines,
        minLines: minLines,
        maxLength: maxLength,
        enabled: enabled,
        readOnly: readOnly,
        autofocus: autofocus,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        inputFormatters: inputFormatters,
      ),
    );
  }
}

/// 带 [FormField] 校验的玻璃输入框，替代 Material [TextFormField]。
///
/// 渲染仍用 [GlassTextField]，但叠加 [FormField<String>] 桥接 validator /
/// onSaved / initialValue；错误文案显示在输入框下方。
class MiraTextFormField extends FormField<String> {
  MiraTextFormField({
    super.key,
    TextEditingController? controller,
    FocusNode? focusNode,
    String? initialValue,
    String? hintText,
    String? labelText,
    Widget? prefixIcon,
    Widget? suffixIcon,
    bool obscureText = false,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    super.enabled = true,
    bool autofocus = false,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onSubmitted,
    super.validator,
    super.onSaved,
    List<TextInputFormatter>? inputFormatters,
  })  : _controller = controller,
        _focusNode = focusNode,
        super(
          // 外部传入 controller 时，用其当前文本作为 FormField 初值，
          // 这样代码同步/回填后的文本也能被 validator 读到。
          initialValue: controller != null ? controller.text : initialValue,
          builder: (field) {
            final state = field as _MiraTextFormFieldState;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Material(
                  type: MaterialType.transparency,
                  child: GlassTextField(
                    controller: state._effectiveController,
                    focusNode: state._effectiveFocusNode,
                    placeholder: hintText ?? labelText,
                    prefixIcon: prefixIcon,
                    suffixIcon: suffixIcon,
                    obscureText: obscureText,
                    keyboardType: keyboardType,
                    textInputAction: textInputAction,
                    enabled: enabled,
                    autofocus: autofocus,
                    onChanged: (v) {
                      field.didChange(v);
                      onChanged?.call(v);
                    },
                    onSubmitted: onSubmitted,
                    inputFormatters: inputFormatters,
                  ),
                ),
                if (field.hasError)
                  Padding(
                    padding: const EdgeInsets.only(top: 6, left: 4),
                    child: Text(
                      field.errorText ?? '',
                      style: TextStyle(
                        color: Theme.of(field.context).colorScheme.error,
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            );
          },
        );

  final TextEditingController? _controller;
  final FocusNode? _focusNode;

  @override
  FormFieldState<String> createState() => _MiraTextFormFieldState();
}

class _MiraTextFormFieldState extends FormFieldState<String> {
  TextEditingController? _createdController;
  FocusNode? _createdFocusNode;

  TextEditingController get _effectiveController =>
      (widget as MiraTextFormField)._controller ??
      (_createdController ??= TextEditingController(text: value));

  FocusNode get _effectiveFocusNode =>
      (widget as MiraTextFormField)._focusNode ??
      (_createdFocusNode ??= FocusNode());

  @override
  void initState() {
    super.initState();
    // 监听外部对 controller.text 的修改（如代码同步、回填），
    // 同步进 FormField 的 value，确保 validator 能读到最新文本。
    _effectiveController.addListener(_handleControllerChanged);
  }

  @override
  void didUpdateWidget(covariant MiraTextFormField oldWidget) {
    super.didUpdateWidget(oldWidget);
    final newController =
        (widget as MiraTextFormField)._controller ?? _createdController;
    final oldController = oldWidget._controller ?? _createdController;
    if (!identical(newController, oldController)) {
      oldController?.removeListener(_handleControllerChanged);
      newController?.addListener(_handleControllerChanged);
      if (newController != null && newController.text != value) {
        didChange(newController.text);
      }
    }
  }

  /// controller 文本被外部改动（非本框键入）时，把最新值同步进 FormField。
  /// 与 [FormFieldState.didChange] 配合，使 validate() 走最新文本。
  void _handleControllerChanged() {
    final text = _effectiveController.text;
    if (text != value) {
      didChange(text);
    }
  }

  @override
  void dispose() {
    _effectiveController.removeListener(_handleControllerChanged);
    _createdController?.dispose();
    _createdFocusNode?.dispose();
    super.dispose();
  }
}
