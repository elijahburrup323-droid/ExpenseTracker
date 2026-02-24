class OfxParserService
  # Parses OFX/QFX/QBO file content and returns normalized transaction rows.
  # OFX files have two parts: a header section (key:value pairs) and an SGML/XML body.
  # OFX 1.x uses unclosed SGML tags; OFX 2.x uses proper XML.
  #
  # Returns: Array of hashes: [{ date:, amount:, description:, memo:, fit_id:, type: }]
  def self.parse(file_content)
    new(file_content).parse
  end

  def initialize(file_content)
    @content = file_content.to_s.encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
  end

  def parse
    body = extract_body
    xml = fix_sgml_tags(body)

    doc = Nokogiri::XML(xml) { |config| config.recover }

    transactions = []
    doc.css("STMTTRN").each do |txn|
      transactions << extract_transaction(txn)
    end

    transactions
  end

  private

  # Strip the OFX header (everything before <OFX>)
  def extract_body
    # Find the start of the XML/SGML body
    idx = @content.index(/<OFX>/i)
    return @content if idx.nil?
    @content[idx..]
  end

  # Close unclosed SGML tags for OFX 1.x compatibility.
  # OFX 1.x uses tags like: <DTPOSTED>20260215 (no closing tag)
  # We need to close them so Nokogiri can parse as XML.
  def fix_sgml_tags(sgml)
    # Known OFX leaf elements that contain data values (not containers)
    leaf_tags = %w[
      TRNTYPE DTPOSTED DTUSER DTAVAIL TRNAMT FITID CORRECTFITID CORRECTACTION
      SIC NAME PAYEEID MEMO CHECKNUM REFNUM
      CURRATE CURSYM ORIGCURRENCY
      BANKID BRANCHID ACCTID ACCTTYPE
      BALAMT DTASOF MKTVAL DTPRICEASOF UNITPRICE UNITS
      DTSTART DTEND DTSERVER LANGUAGE INTU_BID INTU_USERID
      ORG FID APPID APPVER TSKEYEXPIRE TSKEY
      CODE SEVERITY MESSAGE
    ].freeze

    result = sgml.dup

    leaf_tags.each do |tag|
      # Match <TAG>value (no closing tag) and add </TAG>
      result.gsub!(%r{<#{tag}>([^<\r\n]*)}i) do
        "<#{tag}>#{$1}</#{tag}>"
      end
    end

    result
  end

  def extract_transaction(txn)
    {
      date: parse_ofx_date(text_content(txn, "DTPOSTED")),
      amount: text_content(txn, "TRNAMT")&.to_f,
      description: text_content(txn, "NAME") || text_content(txn, "MEMO") || "",
      memo: text_content(txn, "MEMO") || "",
      fit_id: text_content(txn, "FITID") || "",
      type: text_content(txn, "TRNTYPE") || ""
    }
  end

  def text_content(node, tag_name)
    el = node.at_css(tag_name)
    el&.text&.strip.presence
  end

  # OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
  def parse_ofx_date(raw)
    return nil if raw.blank?
    date_part = raw[0..7] # YYYYMMDD
    return nil unless date_part&.length == 8
    "#{date_part[0..3]}-#{date_part[4..5]}-#{date_part[6..7]}"
  rescue
    raw
  end
end
