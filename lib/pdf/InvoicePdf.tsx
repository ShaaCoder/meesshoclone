import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 20 },
  section: { marginBottom: 10 },
  title: { fontSize: 20, marginBottom: 10 },
  text: { fontSize: 12 },
});

export const InvoicePDF = ({ invoice }: any) => {
  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>Invoice</Text>

        <View style={styles.section}>
          <Text style={styles.text}>Invoice ID: {invoice.id}</Text>
          <Text style={styles.text}>Order ID: {invoice.order_id}</Text>
          <Text style={styles.text}>
            Date: {new Date(invoice.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            Base Price: ₹{invoice.details?.base_price}
          </Text>
          <Text style={styles.text}>
            Margin: ₹{invoice.details?.margin}
          </Text>
          <Text style={styles.text}>
            Total: ₹{invoice.amount}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>Status: {invoice.status}</Text>
        </View>

        <Text style={{ marginTop: 20, fontSize: 10 }}>
          Thank you for shopping with us ❤️
        </Text>
      </Page>
    </Document>
  );
};