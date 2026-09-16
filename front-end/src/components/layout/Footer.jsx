const Footer = () => {
  return (
    <footer className="py-8 text-center border-t border-gray-200 mt-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Salon System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
