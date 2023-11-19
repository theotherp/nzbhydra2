# -*- mode: python -*-

block_cipher = None


a = Analysis(['nzbhydra2wrapperPy3.py'],
             binaries=None,
             datas=None,
             hiddenimports=["requests", "pillow"],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          name='NZBHydra2 Console',
          debug=False,
          strip=False,
          upx=True,
          console=True , version='VersionInfoConsole.txt', icon='nzbhydra.ico')
