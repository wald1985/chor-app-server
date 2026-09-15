import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type {
  EmailMessage,
  EmailSender,
} from '../domain/ports/email-sender.port';

@Injectable()
export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(configService: ConfigService) {
    const host = configService.getOrThrow<string>('MAIL_HOST');
    const port = configService.getOrThrow<number>('MAIL_PORT');
    const user = configService.getOrThrow<string>('MAIL_USERNAME');
    const pass = configService.getOrThrow<string>('MAIL_PWD');

    this.fromAddress = user;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
