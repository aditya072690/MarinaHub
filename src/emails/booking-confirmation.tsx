import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatInTimeZone } from "date-fns-tz";
import * as React from "react";

interface BookingConfirmationEmailProps {
  customerName: string;
  boatName: string;
  marinaName: string;
  startAt: string;
  endAt: string;
  totalPrice: number;
  timezone: string;
  ticketUrl: string;
}

export const BookingConfirmationEmail = ({
  customerName = "Guest",
  boatName = "Boat",
  marinaName = "Marina",
  startAt = new Date().toISOString(),
  endAt = new Date(Date.now() + 3600000).toISOString(),
  totalPrice = 0,
  timezone = "America/Chicago",
  ticketUrl = "https://marinahub.app",
}: BookingConfirmationEmailProps) => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  const formattedDate = formatInTimeZone(startDate, timezone, "EEEE, MMMM do, yyyy");
  const formattedStartTime = formatInTimeZone(startDate, timezone, "h:mm a");
  const formattedEndTime = formatInTimeZone(endDate, timezone, "h:mm a");

  return (
    <Html>
      <Head />
      <Preview>Your booking at {marinaName} is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Booking Confirmed</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Your booking for the <strong>{boatName}</strong> at <strong>{marinaName}</strong> has been successfully confirmed.
          </Text>

          <Section style={detailsSection}>
            <Text style={detailText}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={detailText}>
              <strong>Time:</strong> {formattedStartTime} - {formattedEndTime}
            </Text>
            <Text style={detailText}>
              <strong>Total:</strong> ${totalPrice.toFixed(2)}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={ticketUrl}>
              View Digital Ticket
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Need help? Contact the marina directly through your digital ticket page.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  border: "1px solid #e6ebf1",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  maxWidth: "580px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  padding: "20px 0",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  padding: "0 48px",
};

const detailsSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "4px",
  padding: "24px",
  margin: "24px 48px",
};

const detailText = {
  margin: "0 0 10px 0",
  color: "#334155",
  fontSize: "15px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0ea5e9",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
};
