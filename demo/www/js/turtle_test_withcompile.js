// 追加のデフォルトコード
const defCode =
  'TJSベースURLは空;' +
  'TJSライブラリ名は\'three\';' +
  'TJSライブラリ読み込む;'
;

let displayId = 'src_box_info'
const errorId = 'err'
const exceptionId = 'exception'

// なでしこの関数をカスタマイズ
navigator.nako3.setFunc('表示', [['と', 'を']], function (s) {
  console.log(s)
  navigator.nako3.logger.info(s)
})
navigator.nako3.logger.addListener("error", function (obj) {
    document.getElementById(errorId).innerHTML += obj.html
    document.getElementById(errorId).style.display = 'block'
},false) 
navigator.nako3.logger.addListener("warn", function (obj) {
    document.getElementById(errorId).innerHTML += obj.html
    document.getElementById(errorId).style.display = 'block'
},false) 
navigator.nako3.logger.addListener("info", function (obj) {
    document.getElementById(displayId).innerHTML += obj.html
},false) 

function runBoxButton (id, method) {
  if (id === null) {
    window.alert('idが設定されていません。')
    return
  }
  displayId = id + '_info'

  const code = document.getElementById(id).value
  const preCode = defCode
  const file = 'main.nako3'
  document.getElementById(displayId).innerHTML = ''
  document.getElementById(displayId).style.textAlign = 'left'
  document.getElementById(displayId).style.whiteSpace = 'normal'
  document.getElementById(errorId).style.display = 'none'

  const nako3 = navigator.nako3
  nako3.warnUndefinedReturnUserFunc = 1
  nako3.warnUndefinedCallingUserFunc = 1
  nako3.warnUndefinedCallingSystemFunc = 1
  nako3.warnUndefinedCalledUserFuncArgs = 1

  // 依存ファイルを読み込む。
  const promise = nako3.loadDependencies(preCode + code, file, preCode, {})
    .then(function () {
      if (method === 'lexer') {
        const result = nako3.lex(preCode + code, file, preCode)

        document.getElementById('backlink').href = '#' + id + '_head'
        window.location.href = '#run'

        return result.tokens
      } else
      if (method === 'parse') {
        const result = nako3.parse(preCode + code, file, preCode)

        document.getElementById('backlink').href = '#' + id + '_head'
        window.location.href = '#run'

        return result
      } else
      if (method === 'compile') {
        const result = nako3.compile(preCode + code, file, false, preCode)

        document.getElementById('backlink').href = '#' + id + '_head'
        window.location.href = '#run'

        return result
      } else {
        const result = nako3.runReset(preCode + code, file, preCode)

        document.getElementById('backlink').href = '#' + id + '_head'
        window.location.href = '#run'

        return result
      }
   })
   //.catch(function (err) { // エラーはloggerに送られるためここでは何もしなくて良い
   //  console.error(err)
   //  return  Promise.reject()
   //})
   .then(function (res) {
     if (method === 'lexer') {
       document.getElementById(displayId).style.textAlign = 'left'
       document.getElementById(displayId).style.whiteSpace = 'pre-wrap'
       const lines = []
       res.forEach((element, index) => {
         const cols = []
         cols.push(element.type)
         cols.push(element.file)
         cols.push(element.line)
         cols.push(element.column)
         cols.push(element.value)
         cols.push(element.josi)
         cols.push(element.rawJosi)
         lines.push(cols)
       })
       let table = '<table>'
       table += '<thead><tr><th>type</th><th>file</th><th>L#</th><th>C#</th><th>value</th><th>josi</th><th>(raw)</th></tr></thead>'
       table += '<tbody>'
       lines.forEach(line => {
         table += '<tr>'
         table += '<td>' + line.join('</td><td>') + '</td>'
         table += '</tr>'
       })
       table += '</tbody>'
       table += '</table>'
       document.getElementById(displayId).innerHTML = table
     } else
     if (method === 'parse') {
       document.getElementById(displayId).style.textAlign = 'left'
       document.getElementById(displayId).style.whiteSpace = 'pre-wrap'
       document.getElementById(displayId).innerText = JSON.stringify(res, null, 2)
     } else
     if (method === 'compile') {
       document.getElementById(displayId).style.textAlign = 'left'
       document.getElementById(displayId).style.whiteSpace = 'pre-wrap'
       document.getElementById(displayId).innerText = res
     }
     document.getElementById(exceptionId).style.display = 'none'
   })
   // .catch(function (err) { console.error(err) })
   .catch(function (err) {
     document.getElementById(exceptionId).innerText = err.toString()
     document.getElementById(exceptionId).style.display = 'block'
     console.error(err)
   })
}

// 簡易DOMアクセス関数など
function runBox (id) {
  runBoxButton(id, 'run')
}

function compileBox (id) {
  runBoxButton(id, 'compile')
}

function parseBox (id) {
  runBoxButton(id, 'parse')
}

function lexerBox (id) {
  runBoxButton(id, 'lexer')
}

function resetBoxTurtle (id) {
  if (id === null)
    id = 'src_box'

  displayId = id + '_info'

  document.getElementById(displayId).innerHTML = ''
  document.getElementById(errorId).style.display = 'none'
  document.getElementById(exceptionId).style.display = 'none'
  const cv = document.getElementById('three_cv')
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height)
  navigator.nako3.reset()
  navigator.nako3.run('TJS全消去;')
  navigator.nako3._runEx('','clear.nako3',{resetEnv:true},'')
}
