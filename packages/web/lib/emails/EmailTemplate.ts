import { EmailType } from "@/lib/mailer";

interface AuthEmailTemplateProps {
  actionLink: string;
  emailType: EmailType;
}

export const EmailTemplate = ({
  actionLink,
  emailType,
}: AuthEmailTemplateProps) => {
  const isVerify = emailType === EmailType.VERIFY;

  const title = isVerify ? "Verify your email" : "Reset your password";

  const description = isVerify
    ? "Thanks for signing up! Please verify your email address to activate your XCHG LAB account."
    : "We received a request to reset your password. Click the button below to choose a new password.";

  const buttonText = isVerify ? "Verify Email" : "Reset Password";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<style>
body{
  margin:0;
  padding:0;
  background:#09090b;
  font-family:Arial,Helvetica,sans-serif;
  -webkit-text-size-adjust:100%;
}

table{
  border-collapse:collapse;
}

img{
  border:0;
}

@media only screen and (max-width:600px){

  .card{
    width:100%!important;
  }

  .content{
    padding:28px 24px!important;
  }

  .title{
    font-size:24px!important;
    line-height:32px!important;
  }

  .text{
    font-size:15px!important;
    line-height:24px!important;
  }

  .button{
    display:inline-block!important;
    padding:14px 22px!important;
  }
}
</style>
</head>

<body>

<table
width="100%"
cellpadding="0"
cellspacing="0"
bgcolor="#09090b"
style="padding:32px 16px;"
>

<tr>

<td align="center">

<table
class="card"
width="560"
cellpadding="0"
cellspacing="0"
style="
width:560px;
max-width:560px;
background:#18181b;
border:1px solid #27272a;
border-radius:12px;
overflow:hidden;
">

<tr>
<td bgcolor="#3458ff" height="3"></td>
</tr>

<tr>
<td class="content" style="padding:40px;">

<!-- Logo -->

<table width="100%">
<tr>
<td align="center">

<h2
style="
margin:0;
color:#fafafa;
font-size:24px;
font-weight:700;
letter-spacing:.4px;
">
XCHG LAB
</h2>

<p
style="
margin:8px 0 0;
font-size:13px;
color:#71717a;
">
Secure Trading Platform
</p>

</td>
</tr>
</table>

<table width="100%">
<tr><td height="40"></td></tr>
</table>

<!-- Title -->

<h1
class="title"
style="
margin:0;
font-size:30px;
font-weight:600;
line-height:38px;
color:#fafafa;
">
${title}
</h1>

<table width="100%">
<tr><td height="16"></td></tr>
</table>

<!-- Description -->

<p
class="text"
style="
margin:0;
font-size:16px;
line-height:28px;
color:#a1a1aa;
">
${description}
</p>

<table width="100%">
<tr><td height="32"></td></tr>
</table>

<!-- CTA -->

<a
href="${actionLink}"
target="_blank"
style="
display:inline-block;
padding:14px 28px;
background:#3458ff;
color:#ffffff;
text-decoration:none;
font-size:15px;
font-weight:600;
border-radius:8px;
">
${buttonText}
</a>

<table width="100%">
<tr><td height="28"></td></tr>
</table>

<p
style="
margin:0;
font-size:13px;
line-height:22px;
color:#71717a;
">
This link expires in <strong style="color:#fafafa;">20 minutes</strong>.
</p>

<table width="100%">
<tr><td height="36"></td></tr>
</table>

<hr
style="
border:none;
border-top:1px solid #27272a;
margin:0;
">

<table width="100%">
<tr><td height="28"></td></tr>
</table>

<p
style="
margin:0;
font-size:12px;
line-height:20px;
color:#71717a;
">
If the button doesn't work, copy and paste this URL into your browser:
</p>

<table width="100%">
<tr><td height="12"></td></tr>
</table>

<p
style="
margin:0;
font-size:12px;
line-height:20px;
word-break:break-all;
">
<a
href="${actionLink}"
style="
color:#3458ff;
text-decoration:none;
">
${actionLink}
</a>
</p>

<table width="100%">
<tr><td height="36"></td></tr>
</table>

<hr
style="
border:none;
border-top:1px solid #27272a;
margin:0;
">

<table width="100%">
<tr><td height="24"></td></tr>
</table>

<p
style="
margin:0;
font-size:12px;
line-height:20px;
color:#71717a;
">
If you didn't request this email, you can safely ignore it.
</p>

<table width="100%">
<tr><td height="18"></td></tr>
</table>

<p
style="
margin:0;
font-size:11px;
color:#52525b;
">
© ${new Date().getFullYear()} XCHG LAB. All rights reserved.
</p>

</td>
</tr>

</table>

</td>

</tr>

</table>

</body>
</html>
`;
};
