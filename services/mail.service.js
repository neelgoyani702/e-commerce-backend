import nodemailer from "nodemailer";

async function sendEmail(email, subject, data) {
  let mailTransporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    host: "smtp.gmail.com",
    secure: true,
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASSWORD,
    },
  });

  let mailDetails = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: subject,
    text: data,
    html: `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document</title>
            </head>
            <body>
            <br>
            <br>
            <div>Thanks For Registration</div>
    </body>
    </html>
            </body>
            </html>`,
  };

  await mailTransporter.sendMail(mailDetails, function (err, data) {
    if (err) {
      console.log("error in node mailer", err);
      // console.log("No recipients defined");
      return "No recipients defined";
    } else {
      console.log("Email sent successfully");
      return "Email sent successfully";
    }
  });
}

// console.log(sendEmail("divy2103@gmail.com", "hi test", "test"));
// console.log(sendEmail("21it067@charusat.edu.in","hi test","test"))

export { sendEmail };
