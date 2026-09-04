!macro customInstall
  ; 确保快捷方式指向正确的可执行文件
  CreateShortCut "$DESKTOP\MDEditor.lnk" "$INSTDIR\MDEditor.exe" "" "$INSTDIR\MDEditor.exe" 0
  CreateShortCut "$SMPROGRAMS\MDEditor.lnk" "$INSTDIR\MDEditor.exe" "" "$INSTDIR\MDEditor.exe" 0
!macroend

!macro customUnInstall
  ; 清理快捷方式
  Delete "$DESKTOP\MDEditor.lnk"
  Delete "$SMPROGRAMS\MDEditor.lnk"
!macroend
