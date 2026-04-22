# Built-in Dictionary Attribution

LexiNote's built-in CET4 and CET6 dictionaries are derived from ECDICT.

- Source: https://github.com/skywind3000/ECDICT
- License: MIT
- Data file: `ecdict.csv`

The generated LexiNote resources keep only the fields needed by the plugin:
`word`, `normalizedWord`, `dictionaryName`, `difficulty`, `meaning`, and `source`.
CET4 entries are generated from ECDICT rows tagged with `cet4`; CET6 entries are
generated from rows tagged with `cet6`, excluding words already present in CET4.
