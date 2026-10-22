import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static String format(dynamic value) {
    if (value == null) return 'Rp 0';
    num numValue = 0;
    if (value is num) {
      numValue = value;
    } else if (value is String) {
      numValue = num.tryParse(value) ?? 0;
    }
    return _formatter.format(numValue);
  }
}
