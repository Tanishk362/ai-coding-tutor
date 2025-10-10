export default function AdminRedirect() {
  if (typeof window !== "undefined") {
    window.location.replace("/admin/chatbots");
  }
  return null;
}
