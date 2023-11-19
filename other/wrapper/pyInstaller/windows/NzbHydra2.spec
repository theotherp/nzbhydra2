# -*- mode: python -*-

block_cipher = None


a = Analysis(['nzbhydra2wrapperWindows.py'],
             binaries=None,
             datas=[('nzbhydra.ico', '.')],
             hiddenimports=["requests", "pillow", "pystray"],
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
          name='NZBHydra2',
          debug=False,
          strip=False,
          upx=True,
          console=False , version='VersionInfo.txt', icon='nzbhydra.ico')
