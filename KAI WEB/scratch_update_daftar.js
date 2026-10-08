const fs = require('fs');
const path = '../SiparkaApp/lib/screens/daftar_sarana.dart';
let content = fs.readFileSync(path, 'utf8');

// Update _onLanjut to validate nomorKA
content = content.replace(
  /void _onLanjut\(\) \{/,
  `void _onLanjut() {
    if (widget.keretaApi.nomorKA.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Harap pilih Nomor KA terlebih dahulu!',
            style: AplikasiTheme.bodyMedium.copyWith(color: Colors.white),
          ),
          backgroundColor: AplikasiTheme.dangerRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }`
);

// Update UI to show Dropdown if nomorKA is empty
content = content.replace(
  /child: Text\(\s*displayName,\s*style: GoogleFonts\.poppins\(\s*color: const Color\(0xFF003058\),\s*fontSize: 18,\s*fontWeight: FontWeight\.bold,\s*\),\s*\),/m,
  `child: (ka.nomorKA.isEmpty && ka.pilihanNoKA != null && ka.pilihanNoKA!.isNotEmpty)
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                "$cleanName | ",
                                style: GoogleFonts.poppins(
                                  color: const Color(0xFF003058),
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              DropdownButton<String>(
                                value: null,
                                hint: Text('Pilih No KA', style: GoogleFonts.poppins(fontSize: 16, color: Colors.grey)),
                                underline: const SizedBox(),
                                icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF003058)),
                                items: ka.pilihanNoKA!.map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value, style: GoogleFonts.poppins(fontSize: 16, color: const Color(0xFF003058), fontWeight: FontWeight.bold)),
                                  );
                                }).toList(),
                                onChanged: (newValue) {
                                  if (newValue != null) {
                                    setState(() {
                                      ka.nomorKA = newValue;
                                    });
                                  }
                                },
                              ),
                            ],
                          )
                        : Text(
                            displayName,
                            style: GoogleFonts.poppins(
                              color: const Color(0xFF003058),
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),`
);

fs.writeFileSync(path, content, 'utf8');
console.log('daftar_sarana.dart updated successfully');
