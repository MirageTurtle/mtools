' Written by ChatGPT gpt-4o
' some bug: it cannot update multi selected slides

Sub UpdateSlideNumbersAndContinueAfterSelection()
    Dim selSlides As SlideRange
    On Error Resume Next
    Set selSlides = ActiveWindow.Selection.SlideRange
    On Error GoTo 0

    If selSlides Is Nothing Then
        MsgBox "Please select one or more slides first.", vbExclamation
        Exit Sub
    End If

    ' Prompt for starting page number
    Dim startNumberStr As String
    Dim startNumber As Integer
    startNumberStr = InputBox("Enter the starting page number:", "Set Page Number")

    If Not IsNumeric(startNumberStr) Then
        MsgBox "Please enter a valid number.", vbCritical
        Exit Sub
    End If

    startNumber = CInt(startNumberStr)

    ' Collect and sort selected slide indices
    Dim selectedIndices() As Integer
    ReDim selectedIndices(1 To selSlides.Count)
    Dim i As Integer
    For i = 1 To selSlides.Count
        selectedIndices(i) = selSlides(i).SlideIndex
    Next i
    Call BubbleSort(selectedIndices)

    ' Apply numbering to selected slides
    Dim sld As Slide
    Dim idx As Integer: idx = 0
    Dim lastIndex As Integer

    For i = LBound(selectedIndices) To UBound(selectedIndices)
        Set sld = ActivePresentation.Slides(selectedIndices(i))
        Call ReplaceSlideNumberPlaceholder(sld, startNumber + idx)
        idx = idx + 1
        lastIndex = selectedIndices(i)
    Next i

    ' Apply numbering to slides after the last selected slide
    Dim currentNumber As Integer: currentNumber = startNumber + idx
    Dim totalSlides As Integer: totalSlides = ActivePresentation.Slides.Count

    Dim j As Integer
    For j = lastIndex + 1 To totalSlides
        Set sld = ActivePresentation.Slides(j)
        Call ReplaceSlideNumberPlaceholder(sld, currentNumber)
        currentNumber = currentNumber + 1
    Next j

    MsgBox "Slide numbers updated successfully.", vbInformation
End Sub

Sub ReplaceSlideNumberPlaceholder(sld As Slide, pageNum As Integer)
    Dim shp As Shape
    For Each shp In sld.Shapes
        If shp.Type = msoPlaceholder Then
            If shp.PlaceholderFormat.Type = ppPlaceholderSlideNumber Then
                shp.TextFrame.TextRange.Text = CStr(pageNum)
                Exit For
            End If
        End If
    Next shp
End Sub

Sub BubbleSort(arr() As Integer)
    Dim i As Integer, j As Integer, temp As Integer
    For i = LBound(arr) To UBound(arr) - 1
        For j = i + 1 To UBound(arr)
            If arr(i) > arr(j) Then
                temp = arr(i)
                arr(i) = arr(j)
                arr(j) = temp
            End If
        Next j
    Next i
End Sub
