// <!DOCTYPE html>
// <html>

// <head>
//     <title id="title">شبكة فورجي نت</title>
//     <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
//     <meta http-equiv="X-UA-Compatible" content="IE=edge">
//     <meta name="theme-color" content="#3B5998" />
//     <link rel="icon" href="/favicon.ico" type="image/x-icon">
//     <link rel="stylesheet" href="style.css"> <style>
// .main2 {
//   display: grid;
// place-items: center;

//   position: relative;

// }

// .main2::before,
// .main2::after {
//   content: '';
//   position: absolute;
//   top: -4px;
//   left: -4px;
//   background: linear-gradient(45deg,red,blue,green,yellow,#e11d74,black,#ffff00,#aa0000);
//   background-size: 400%;
//   width: calc(100% + 4px);
//   height: calc(100% + 4px);
//   z-index: -1;
//   animation: animate 25s linear infinite;
// }

// .main2::after {
//   filter: blur(25px);
// }

// @keyframes animate {
//   0% {
//     background-position: 0 0;
//   }

//   50% {
//     background-position: 400% 0;
//   }

//   100% {
//     background-position: 0 0;
//   }
// }

// .main1 {
// /*background: #3B5998;
//   color: #f2f2f2;*/
//   background: linear-gradient(to right,#332d2d 0,#000 56%,#ff008f9e 100%);
//   display: grid;
// place-items: center;

//   position: relative;

// max-width: 300px;
//   height: 100%;
//    padding: 10px;

//   margin-left:auto;
//   margin-right:auto;
//     text-align:center;
//   min-height:300px;

// }

// .main1::before,
// .main1::after {
//   content: '';
//   position: absolute;
//   top: -1px;
//   left: -1px;
//   background: linear-gradient(45deg,red,blue,green,yellow,#e11d74,black,#ffff00,#aa0000);
//   background-size: 400%;
//   width: calc(100% + 4px);
//   height: calc(100% + 4px);
//   z-index: -1;
//   animation: animate 25s linear infinite;

// }

// .main1::after {
//   filter: blur(25px);
// }

// @keyframes animate {
//   0% {
//     background-position: 0 0;
//   }

//   50% {
//     background-position: 400% 0;
//   }

//   100% {
//     background-position: 0 0;
//   }
// }

// </style>

// </head>

// <body onLoad="checkCookie()">

//         <form name="sendin" action="http://f.net/login" method="post">
//             <input type="hidden" name="username" />
//             <input type="hidden" name="password" />
//             <input type="hidden" name="dst" value="" />
//             <input type="hidden" name="popup" value="true" />
// 		    <input type="hidden" name="speed" value="false" />
//         </form>
//         <script type="text/javascript" src="md5.js"></script>
// 	<script type='text/javascript' language="javascript">
// 	function rem(){
// 	var uname = document.getElementById('uname').value;
//         var passw = document.getElementById('passw').value;
// 		        var speed = document.getElementById('speed').value;
//     var rem   = document.getElementById('remember').checked;
// 	if(rem == true){
//     var date = new Date();
//     date.setTime(date.getTime()+(5*1000));
//     var expires = date.toGMTString();
//     date.setTime(date.getTime()+(259200*1000));
//     var expire  = date.toGMTString();
//     document.cookie = 'uname='+uname+';expires='+expire+'';
//     document.cookie = 'passw='+passw+';expires='+expire+'';
// 	document.cookie = 'speed='+speed+';expires='+expire+'';
//     document.cookie = 'error=1;expires='+expires+'';
//     }
//     else{
//     return;
//     }
// 	}
// 	function getCookie2(){
// 	var date = new Date();
//     date.setTime(date.getTime()+(5*1000));
//     var expires = date.toGMTString();
//     var SP = document.cookie.split(';');
//     for (i=0; i < SP.length; i++) {
//     name_value = SP[i];
//     str = name_value.substring(0,6);
//     if(str.indexOf("uname") !== -1){
//     uname = name_value.split('=');
//     uname = uname[1];
//     }
//     if(str.indexOf("passw") !== -1){
//     passw = name_value.split('=');
//     passw = passw[1];
//     }
// 	if(str.indexOf("speed") !== -1){
//     speed = name_value.split('=');
//     speed = speed[1];
//     }
//     if(str.indexOf("error") !== -1){
//     return;
//     }
//     }
//     if(uname != ""){
//     document.cookie = 'error=1;expires='+expires+'';
//     window.location.href='login?username='+uname+'&password='+passw+'&speed='+speed+'';
//     }
//     }
//    getCookie2();
//  </script>

//             <div id="main" class="main1">

//             <div class="shadow">
//                 <h3 class="brand" style="font-family: 'Cairo', sans-serif;"><B>شبكة فورجي نت</B></h3>
//             </div>

//             <form autocomplete="on" name="login" action="http://f.net/login" method="post"  onSubmit="return doLogin()"
//                 >
//                 <input type="hidden" name="dst" value="" />
//                 <input type="hidden" name="popup" value="true" />
// 								  <select  id="speed" name="speed" >
// <option value="" selected>سرعة افتراضية </option>

// <option value="204123ab-55-sa">
//     سرعة عالية 20 ميجا</option>

// <option value="204ac4311-99-ba">

//    سرعة 10  ميجا
//    </option>
//               <option value="204ccc8c8c44-azd">
//                   سرعة 5 ميجا
//               </option></select>
//                 <input class="username" id='uname' name="username" type="tel" value="13656408035" placeholder="رمز الدخول" /><br>
// 			<input checked id='remember'type='checkbox' name='remember'><font size="3"> <B> حفظ الكرت     </B>  </font>  <input class="password" name="password" placeholder="Password" id='passw' type="hidden"  />

//                 <button class="button" onclick='return rem();' type="submit">دخول</button>

//             </form>

//             <div class="notice"><script type="text/javascript">
// <!--
// var error = "user &lt;13656408035&gt; not found";
// if (error == "simultaneous session limit reached") {
// document.write("الكرت مستخدم في جهـاز آخر ");
// }
// else if (error == "invalid password") {
// document.write("كلمـة المرور غير صحيحـه");
// }
// else if (error == "no valid profile found") {
// document.write("انتهت صلاحية الرصيد");
// }
// else if(error.search("not found") != -1) {
// document.write(" المستخدم غير موجود");
// }
// else if(error.search("no more sessions are allowed for user") != -1) {
// document.write("الكرت مستخدم في جهـاز آخر");
// }
// else if (error == "uptime limit reached") {
// document.write("انتهى رصيـد هذا الكرت");
// }
// else if (error == "invalid Calling-Station-Id") {
// document.write("لا يمكنك استخدام هذا الرقم , لأنه تم تخصيصة لجهـاز آخر");
// }
// else if (error == "web browser did not send challenge response (try again, enable JavaScript)") {
// document.write("أعد المحاولة مرة أخرى , اذا ضهرت هذه الرسـاله مجدداً فيجب تفعيل الجافا سكربت في متصفحك");
// }
// else if (error == "download limit reached") {
// document.write("انتهى رصيـد هذا الكرت");
// }
// else if (error == "transfer limit reached") {
// document.write("لقد استغرغت كامل رصيد الانترنت الخاص بهذا الكرت");
// }
// else if(error.search("uptime limit reached") != -1) {
// document.write("انتهى رصيـد هذا الكرت");
// }
// else document.write("user &lt;13656408035&gt; not found ");

//  //-->
// 					</script></div><marquee direction=right style="TAHOMA:150%; font-size:12pt; color:white;"f;">ومن يتق الله يجعل له مخرجا ويرزقه من حيث لايحتسب</marquee>

//             <h2>شبكة فورجي نت</h2>
// <p>f.net - رابط الصفحة </p>
// <button class="accordion">نقاط البيع</button>
// <div class="panel">
//    <p><b>جميع البقالات المجاورة للشبكة</b>

// </div>
// <button class="accordion">اسعار البطاقات</button>
// <div class="panel">
//   <table dir="rtl" class="table" style="font-size:12px" ;="" cellpadding="2" align="right">
// 				<tbody><tr class="auto-style19" style="" ;="">
// 					<td class="auto-style18">السعر</td>
// 					<td class="auto-style18">الوقت</td>
// 					<td class="auto-style18">الصلاحية</td>
// 					<td class="auto-style18">التحميل الجديد</td>
//                     </tr>
// 				<tr>
// 					<td class="auto-style20"><strong>200 ريال</strong></td>
// 					<td class="auto-style20"><strong>5 ساعات</strong></td>
// 					<td class="auto-style20"><strong>5ايام</strong></td>
// 					<td class="auto-style20"><strong>500 ميجا </strong></td>
// 				</tr>
// 				<tr>
// 					<td class="auto-style20"><strong>300 ريال</strong></td>
// 					<td class="auto-style20"><strong>8 ساعات</strong></td>
// 					<td class="auto-style20"><strong>8 ايام</strong></td>
// 					<td class="auto-style20"><strong>750 ميجا </strong></td>
// 				</tr>

// <tr>
// 					<td class="auto-style20"><strong>500 ريال</strong></td>
// 					<td class="auto-style20"><strong>10 ساعات</strong></td>
// 					<td class="auto-style20"><strong>10 ايام</strong></td>
// 					<td class="auto-style20"><strong>1500 ميجا </strong></td>
// 				</tr>

// <tr>
// 					<td class="auto-style20"><strong>1000 ريال</strong></td>
// 					<td class="auto-style20"><strong>16 ساعات</strong></td>
// 					<td class="auto-style20"><strong>18 يوم</strong></td>
// 					<td class="auto-style20"><strong>3000 ميجا </strong></td>
// 				</tr>
// 																		</tbody></table>
// </div>
// <button class="accordion">للتواصل</button>
// <div class="panel">
//    <p><b>772029098</b>

// </div>
// <button class="accordion">ارشادات استخدام</button>
// <div class="panel">

//                   #. نصائح مهمه لحل مشكلة انتهاء رصيد الكروت

//                   <br>
//                  <p> <b> ايقاف تحديثات الجوال التلقائية</b>
//                  	<br>
// 					<br>
//                  <p> <b> ايقاف تحديثات التطبيقات من سوق بلاي</b>
//                  	<br>
// 						<br>
//                  <p> <b> مشاهدة فيديو اليوتيوب بجودة لاتزيد عن 360 </b>
//                  	<br>

//                    </p> <p> <b> تفعيل توفير الطاقة في الجوال </b>
//                  	<br>

//                    </p>
// </div>

//                 <br />
//                    <div>
//                                     </div>
//                  <br />
//                 <div class="box" style="color:#fff;">

//  <i>شبكة فورجي نت</i><br />

//             <!-- Tolong jangan dihilangkan bagian ini-->
//         </div>
//         </div>

// <script type="text/javascript">
// var hostname = window.location.hostname;
// document.getElementById('title').innerHTML = hostname  + " > login";

// document.login.username.focus();

// var infologin = document.getElementById('infologin');
// infologin.innerHTML = "Masukkan Kode Voucher kemudian klik login";

// // login page 2 mode by Laksamadi Guko
// var username = document.login.username;
// var password = document.login.password;

// username.placeholder = "Kode Voucher";

// // set password = username
// function setpass() {
//     var user = username.value
//     //user = user.toLowerCase();
//     username.value = user;
//     password.value = user;
// }

// username.onkeyup = setpass;

// // change to voucher mode
// function voucher() {
//     username.focus();
//     username.onkeyup = setpass;
//     username.placeholder = "Kode Voucher";
//     username.style = "border-radius:3px;"
//     password.type = "hidden";
//     infologin.innerHTML = "Masukkan Kode Voucher kemudian klik login.";
// }

// // change to member mode
// function member() {
//     username.focus();
//     username.onkeyup = "";
//     username.placeholder = "Username";
//     username.style = "border-radius:3px 3px 0px 0px;"
//     password.type = "password";
//     infologin.innerHTML = "Masukkan Username dan Password kemudian klik login.";
// }
// </script>
//   <div class="progress-container">
//     <div class="progress-bar" id="progressbar"></div>
//   </div>

// <script>
// //<![CDATA[
// window.addEventListener("scroll", myFunction);

// function myFunction() {
//   var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
//   var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
//   var scrolled = (winScroll / height) * 100;
//   document.getElementById("progressbar").style.width = scrolled + "%";
// }
// //]]>
// </script>
// <script>
// var acc = document.getElementsByClassName("accordion");
// var i;

// for (i = 0; i < acc.length; i++) {
//   acc[i].addEventListener("click", function() {
//     this.classList.toggle("active");
//     var panel = this.nextElementSibling;
//     if (panel.style.maxHeight){
//       panel.style.maxHeight = null;
//     } else {
//       panel.style.maxHeight = panel.scrollHeight + "px";
//     }
//   });
// }
// </script>
// </body>

// </html>
// /*
//  * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
//  * Digest Algorithm, as defined in RFC 1321.
//  * Version 1.1 Copyright (C) Paul Johnston 1999 - 2002.
//  * Code also contributed by Greg Holt
//  * See http://pajhome.org.uk/site/legal.html for details.
//  */

// /*
//  * Add integers, wrapping at 2^32. This uses 16-bit operations internally
//  * to work around bugs in some JS interpreters.
//  */
// function safe_add(x, y)
// {
//   var lsw = (x & 0xFFFF) + (y & 0xFFFF)
//   var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
//   return (msw << 16) | (lsw & 0xFFFF)
// }

// /*
//  * Bitwise rotate a 32-bit number to the left.
//  */
// function rol(num, cnt)
// {
//   return (num << cnt) | (num >>> (32 - cnt))
// }

// /*
//  * These functions implement the four basic operations the algorithm uses.
//  */
// function cmn(q, a, b, x, s, t)
// {
//   return safe_add(rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
// }
// function ff(a, b, c, d, x, s, t)
// {
//   return cmn((b & c) | ((~b) & d), a, b, x, s, t)
// }
// function gg(a, b, c, d, x, s, t)
// {
//   return cmn((b & d) | (c & (~d)), a, b, x, s, t)
// }
// function hh(a, b, c, d, x, s, t)
// {
//   return cmn(b ^ c ^ d, a, b, x, s, t)
// }
// function ii(a, b, c, d, x, s, t)
// {
//   return cmn(c ^ (b | (~d)), a, b, x, s, t)
// }

// /*
//  * Calculate the MD5 of an array of little-endian words, producing an array
//  * of little-endian words.
//  */
// function coreMD5(x)
// {
//   var a =  1732584193
//   var b = -271733879
//   var c = -1732584194
//   var d =  271733878

//   for(i = 0; i < x.length; i += 16)
//   {
//     var olda = a
//     var oldb = b
//     var oldc = c
//     var oldd = d

//     a = ff(a, b, c, d, x[i+ 0], 7 , -680876936)
//     d = ff(d, a, b, c, x[i+ 1], 12, -389564586)
//     c = ff(c, d, a, b, x[i+ 2], 17,  606105819)
//     b = ff(b, c, d, a, x[i+ 3], 22, -1044525330)
//     a = ff(a, b, c, d, x[i+ 4], 7 , -176418897)
//     d = ff(d, a, b, c, x[i+ 5], 12,  1200080426)
//     c = ff(c, d, a, b, x[i+ 6], 17, -1473231341)
//     b = ff(b, c, d, a, x[i+ 7], 22, -45705983)
//     a = ff(a, b, c, d, x[i+ 8], 7 ,  1770035416)
//     d = ff(d, a, b, c, x[i+ 9], 12, -1958414417)
//     c = ff(c, d, a, b, x[i+10], 17, -42063)
//     b = ff(b, c, d, a, x[i+11], 22, -1990404162)
//     a = ff(a, b, c, d, x[i+12], 7 ,  1804603682)
//     d = ff(d, a, b, c, x[i+13], 12, -40341101)
//     c = ff(c, d, a, b, x[i+14], 17, -1502002290)
//     b = ff(b, c, d, a, x[i+15], 22,  1236535329)

//     a = gg(a, b, c, d, x[i+ 1], 5 , -165796510)
//     d = gg(d, a, b, c, x[i+ 6], 9 , -1069501632)
//     c = gg(c, d, a, b, x[i+11], 14,  643717713)
//     b = gg(b, c, d, a, x[i+ 0], 20, -373897302)
//     a = gg(a, b, c, d, x[i+ 5], 5 , -701558691)
//     d = gg(d, a, b, c, x[i+10], 9 ,  38016083)
//     c = gg(c, d, a, b, x[i+15], 14, -660478335)
//     b = gg(b, c, d, a, x[i+ 4], 20, -405537848)
//     a = gg(a, b, c, d, x[i+ 9], 5 ,  568446438)
//     d = gg(d, a, b, c, x[i+14], 9 , -1019803690)
//     c = gg(c, d, a, b, x[i+ 3], 14, -187363961)
//     b = gg(b, c, d, a, x[i+ 8], 20,  1163531501)
//     a = gg(a, b, c, d, x[i+13], 5 , -1444681467)
//     d = gg(d, a, b, c, x[i+ 2], 9 , -51403784)
//     c = gg(c, d, a, b, x[i+ 7], 14,  1735328473)
//     b = gg(b, c, d, a, x[i+12], 20, -1926607734)

//     a = hh(a, b, c, d, x[i+ 5], 4 , -378558)
//     d = hh(d, a, b, c, x[i+ 8], 11, -2022574463)
//     c = hh(c, d, a, b, x[i+11], 16,  1839030562)
//     b = hh(b, c, d, a, x[i+14], 23, -35309556)
//     a = hh(a, b, c, d, x[i+ 1], 4 , -1530992060)
//     d = hh(d, a, b, c, x[i+ 4], 11,  1272893353)
//     c = hh(c, d, a, b, x[i+ 7], 16, -155497632)
//     b = hh(b, c, d, a, x[i+10], 23, -1094730640)
//     a = hh(a, b, c, d, x[i+13], 4 ,  681279174)
//     d = hh(d, a, b, c, x[i+ 0], 11, -358537222)
//     c = hh(c, d, a, b, x[i+ 3], 16, -722521979)
//     b = hh(b, c, d, a, x[i+ 6], 23,  76029189)
//     a = hh(a, b, c, d, x[i+ 9], 4 , -640364487)
//     d = hh(d, a, b, c, x[i+12], 11, -421815835)
//     c = hh(c, d, a, b, x[i+15], 16,  530742520)
//     b = hh(b, c, d, a, x[i+ 2], 23, -995338651)

//     a = ii(a, b, c, d, x[i+ 0], 6 , -198630844)
//     d = ii(d, a, b, c, x[i+ 7], 10,  1126891415)
//     c = ii(c, d, a, b, x[i+14], 15, -1416354905)
//     b = ii(b, c, d, a, x[i+ 5], 21, -57434055)
//     a = ii(a, b, c, d, x[i+12], 6 ,  1700485571)
//     d = ii(d, a, b, c, x[i+ 3], 10, -1894986606)
//     c = ii(c, d, a, b, x[i+10], 15, -1051523)
//     b = ii(b, c, d, a, x[i+ 1], 21, -2054922799)
//     a = ii(a, b, c, d, x[i+ 8], 6 ,  1873313359)
//     d = ii(d, a, b, c, x[i+15], 10, -30611744)
//     c = ii(c, d, a, b, x[i+ 6], 15, -1560198380)
//     b = ii(b, c, d, a, x[i+13], 21,  1309151649)
//     a = ii(a, b, c, d, x[i+ 4], 6 , -145523070)
//     d = ii(d, a, b, c, x[i+11], 10, -1120210379)
//     c = ii(c, d, a, b, x[i+ 2], 15,  718787259)
//     b = ii(b, c, d, a, x[i+ 9], 21, -343485551)

//     a = safe_add(a, olda)
//     b = safe_add(b, oldb)
//     c = safe_add(c, oldc)
//     d = safe_add(d, oldd)
//   }
//   return [a, b, c, d]
// }

// /*
//  * Convert an array of little-endian words to a hex string.
//  */
// function binl2hex(binarray)
// {
//   var hex_tab = "0123456789abcdef"
//   var str = ""
//   for(var i = 0; i < binarray.length * 4; i++)
//   {
//     str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
//            hex_tab.charAt((binarray[i>>2] >> ((i%4)*8)) & 0xF)
//   }
//   return str
// }

// /*
//  * Convert an array of little-endian words to a base64 encoded string.
//  */
// function binl2b64(binarray)
// {
//   var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
//   var str = ""
//   for(var i = 0; i < binarray.length * 32; i += 6)
//   {
//     str += tab.charAt(((binarray[i>>5] << (i%32)) & 0x3F) |
//                       ((binarray[i>>5+1] >> (32-i%32)) & 0x3F))
//   }
//   return str
// }

// /*
//  * Convert an 8-bit character string to a sequence of 16-word blocks, stored
//  * as an array, and append appropriate padding for MD4/5 calculation.
//  * If any of the characters are >255, the high byte is silently ignored.
//  */
// function str2binl(str)
// {
//   var nblk = ((str.length + 8) >> 6) + 1 // number of 16-word blocks
//   var blks = new Array(nblk * 16)
//   for(var i = 0; i < nblk * 16; i++) blks[i] = 0
//   for(var i = 0; i < str.length; i++)
//     blks[i>>2] |= (str.charCodeAt(i) & 0xFF) << ((i%4) * 8)
//   blks[i>>2] |= 0x80 << ((i%4) * 8)
//   blks[nblk*16-2] = str.length * 8
//   return blks
// }

// /*
//  * Convert a wide-character string to a sequence of 16-word blocks, stored as
//  * an array, and append appropriate padding for MD4/5 calculation.
//  */
// function strw2binl(str)
// {
//   var nblk = ((str.length + 4) >> 5) + 1 // number of 16-word blocks
//   var blks = new Array(nblk * 16)
//   for(var i = 0; i < nblk * 16; i++) blks[i] = 0
//   for(var i = 0; i < str.length; i++)
//     blks[i>>1] |= str.charCodeAt(i) << ((i%2) * 16)
//   blks[i>>1] |= 0x80 << ((i%2) * 16)
//   blks[nblk*16-2] = str.length * 16
//   return blks
// }

// /*
//  * External interface
//  */
// function hexMD5 (str) { return binl2hex(coreMD5( str2binl(str))) }
// function hexMD5w(str) { return binl2hex(coreMD5(strw2binl(str))) }
// function b64MD5 (str) { return binl2b64(coreMD5( str2binl(str))) }
// function b64MD5w(str) { return binl2b64(coreMD5(strw2binl(str))) }
// /* Backward compatibility */
// function calcMD5(str) { return binl2hex(coreMD5( str2binl(str))) }
