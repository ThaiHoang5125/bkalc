// Kết quả tư vấn môn học tự chọn tự do do Khoa Điện - Điện tử công bố (file "Kết quả tư vấn môn học tự chọn tự do cho sinh viên").
// Chỉ để tra cứu: không phải danh sách gợi ý nên học, và không có số tín chỉ trong file nguồn.
export type FreeStatus = 'free' | 'excluded' | 'once' | 'other';
/** [mã môn, tên môn, trạng thái, nhận xét của Khoa (rỗng nếu là tự chọn tự do thông thường), ghi chú] */
export type FreeRow = [string, string, FreeStatus, string, string];
export interface FreeMajor { key: string; label: string; courses: FreeRow[] }

export const FREE_SOURCE = 'Khoa Điện - Điện tử: Kết quả tư vấn môn học tự chọn tự do cho sinh viên';

export const FREE_MAJORS: FreeMajor[] = [
 {
  "key": "CTTT _ Hệ thống mạch phần cứng",
  "label": "CTTT _ Hệ thống mạch phần cứng",
  "courses": [
   [
    "CO1003",
    "Nhập môn về lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE2415)"
   ],
   [
    "CO1007",
    "Cấu trúc rời rạc cho khoa học máy tính",
    "free",
    "",
    ""
   ],
   [
    "CO1027",
    "Kỹ thuật lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE2415)"
   ],
   [
    "CO2011",
    "Mô hình hóa toán học",
    "free",
    "",
    ""
   ],
   [
    "CO2039",
    "Lập trình nâng cao",
    "free",
    "",
    ""
   ],
   [
    "CO3031",
    "Phân tích và thiết kế giải thuật",
    "free",
    "",
    ""
   ],
   [
    "CO3057",
    "Xử lý ảnh số và thị giác máy tính",
    "free",
    "",
    ""
   ],
   [
    "EE2015",
    "Xử lý số tín hiệu",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE3403",
    "Cơ sở hệ thống điều khiển",
    "free",
    "",
    ""
   ],
   [
    "EE3405",
    "Mạch công suất và điện cơ",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE4433",
    "Thiết kế ứng dụng IoT",
    "free",
    "",
    ""
   ],
   [
    "EE4449",
    "Kỹ thuật số nâng cao",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE4451",
    "Thiết kế vi mạch số",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE4453",
    "Thiết kế vi mạch tương tự",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE4455",
    "Trí tuệ nhân tạo",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EN1005",
    "Sinh thái học",
    "free",
    "",
    ""
   ],
   [
    "IM1001",
    "Giới thiệu ngành",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1011",
    "Máy tính trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM1013",
    "Kinh tế học đại cương",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1015",
    "Kế toán tài chính",
    "free",
    "",
    ""
   ],
   [
    "IM1017",
    "Thống kê trong kinh doanh",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1019",
    "Tiếp thị căn bản",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "free",
    "",
    ""
   ],
   [
    "IM1023",
    "Quản lý sản xuất cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM2017",
    "Hành vi tổ chức",
    "free",
    "",
    ""
   ],
   [
    "IM3001",
    "Quản trị kinh doanh cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3023",
    "Thương mại điện tử",
    "free",
    "",
    ""
   ],
   [
    "IM3047",
    "Giao tiếp trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM3063",
    "Quản lý chất lượng",
    "free",
    "",
    ""
   ],
   [
    "ME3007",
    "Vi điều khiển",
    "other",
    "Nếu SV dùng môn EE3413 làm môn tự chọn chuyên ngành thì sẽ không được tính môn ME3007 làm tự chọn tự do",
    "Trùng lắp (EE3413) chỉ tính 1"
   ]
  ]
 },
 {
  "key": "CTTT _ Tự động hóa",
  "label": "CTTT _ Tự động hóa",
  "courses": [
   [
    "CH1015",
    "Hóa đại cương",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "CH2027",
    "Sinh học đại cương",
    "free",
    "",
    ""
   ],
   [
    "CO1027",
    "Kỹ thuật lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE2415)"
   ],
   [
    "CO2001",
    "Kỹ năng chuyên nghiệp cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE1025)"
   ],
   [
    "CO3027",
    "Thương mại điện tử",
    "free",
    "",
    ""
   ],
   [
    "CO3049",
    "Lập trình web",
    "free",
    "",
    ""
   ],
   [
    "EE2417",
    "Cơ sở máy tính",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE3071",
    "SCADA",
    "other",
    "Môn học của CQ -> Không mở lớp",
    "Môn học thuộc chương trình CQ -> CTTT không đăng ký được"
   ],
   [
    "EE3401",
    "Kỹ thuật hệ thống máy tính",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE3405",
    "Mạch công suất và điện cơ",
    "once",
    "Chỉ được tính 1 lần (Hoặc là định hướng nhóm A, hoặc là tự chọn tự do)",
    "Môn học định hướng nhóm A"
   ],
   [
    "EE3411",
    "Mạch điện tử",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE3413",
    "Vi xử lý",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE3421",
    "Máy điện",
    "free",
    "",
    ""
   ],
   [
    "EE3425",
    "Thiết kế vi mạch",
    "free",
    "",
    ""
   ],
   [
    "EE3427",
    "Thiết kế hệ thống nhúng",
    "free",
    "",
    ""
   ],
   [
    "EE4425",
    "AI và IoT cho hệ thống năng lượng tái tạo",
    "free",
    "",
    ""
   ],
   [
    "EE4427",
    "Lưới điện siêu nhỏ và lưới điện thông minh",
    "free",
    "",
    ""
   ],
   [
    "EE4429",
    "Công nghệ xe điện",
    "free",
    "",
    ""
   ],
   [
    "EE4441",
    "Cơ sở người máy (Robot)",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE4443",
    "Điều khiển phi tuyến và thích nghi",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE4445",
    "Trí tuệ nhân tạo trong điều khiển",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE4447",
    "Hệ thống điều khiển nhúng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE4451",
    "Thiết kế vi mạch số",
    "free",
    "",
    ""
   ],
   [
    "EN1005",
    "Sinh thái học",
    "free",
    "",
    ""
   ],
   [
    "EN2033",
    "Luật và chính sách môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN3073",
    "An toàn lao động và vệ sinh môi trường công nghiệp",
    "free",
    "",
    ""
   ],
   [
    "IM1011",
    "Máy tính trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM1019",
    "Tiếp thị căn bản",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM1023",
    "Quản lý sản xuất cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM2031",
    "Quản lý sản xuất",
    "free",
    "",
    ""
   ],
   [
    "IM2033",
    "Tài chính doanh nghiệp",
    "free",
    "",
    ""
   ],
   [
    "IM3047",
    "Giao tiếp trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM3063",
    "Quản lý chất lượng",
    "free",
    "",
    ""
   ],
   [
    "IM3069",
    "Khởi nghiệp",
    "free",
    "",
    ""
   ],
   [
    "IM4001",
    "Phương pháp nghiên cứu trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM4003",
    "Quản lý dự án",
    "free",
    "",
    ""
   ],
   [
    "ME2089",
    "Vẽ kỹ thuật cơ khí",
    "free",
    "",
    ""
   ],
   [
    "ME3013",
    "Hệ thống PLC",
    "free",
    "",
    ""
   ],
   [
    "ME4133",
    "Hệ thống PLC trong robot và tự động hóa",
    "free",
    "",
    ""
   ],
   [
    "ME4217",
    "Điều khiển các hệ thống servo",
    "free",
    "",
    ""
   ],
   [
    "ME4625",
    "Kỹ năng lãnh đạo",
    "free",
    "",
    ""
   ],
   [
    "SP1035",
    "Chủ nghĩa xã hội khoa học",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ]
  ]
 },
 {
  "key": "CTTT Chưa PN",
  "label": "CTTT Chưa PN",
  "courses": [
   [
    "CO2003",
    "Cấu trúc dữ liệu và giải thuật",
    "free",
    "",
    ""
   ],
   [
    "CO2013",
    "Hệ cơ sở dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "EE4443",
    "Điều khiển phi tuyến và thích nghi",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn của ngành Tự động"
   ],
   [
    "EE4445",
    "Trí tuệ nhân tạo trong điều khiển",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn của ngành Tự động"
   ],
   [
    "EE5013",
    "Kỹ thuật siêu cao tần (PBL)",
    "other",
    "Môn học của PFIEV -> Không mở lớp",
    "Môn học của PFIEV -> CTTT không ĐKMH được"
   ],
   [
    "EE5015",
    "Mạch điện tử thông tin (PBL)",
    "other",
    "Môn học của PFIEV -> Không mở lớp",
    "Môn học của PFIEV -> CTTT không ĐKMH được"
   ],
   [
    "EN1003",
    "Con người và môi trường",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1011",
    "Máy tính trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM1015",
    "Kế toán tài chính",
    "free",
    "",
    ""
   ],
   [
    "IM3063",
    "Quản lý chất lượng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn nhóm C, hoặc là tự chọn tự do)",
    "Môn học tự chọn nhóm C"
   ]
  ]
 },
 {
  "key": "Kỹ thuật Điện",
  "label": "Kỹ thuật Điện",
  "courses": [
   [
    "AS2013",
    "CAD ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "CI1003",
    "Vẽ kỹ thuật",
    "free",
    "",
    ""
   ],
   [
    "CI4205",
    "Cảm thụ cảnh quan",
    "free",
    "",
    ""
   ],
   [
    "CO1005",
    "Nhập môn điện toán",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE1001)"
   ],
   [
    "CO1027",
    "Kỹ thuật lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE2009)"
   ],
   [
    "CO2001",
    "Kỹ năng chuyên nghiệp cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO3027",
    "Thương mại điện tử",
    "free",
    "",
    ""
   ],
   [
    "CO3057",
    "Xử lý ảnh số và thị giác máy tính",
    "other",
    "Nếu SV dùng môn EE3035 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3057 làm tự chọn tự do",
    "Trùng lắp EE3035 (TC) chỉ tính 1"
   ],
   [
    "CO3093",
    "Mạng máy tính",
    "other",
    "Nếu SV dùng môn EE3111 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3093 làm tự chọn tự do",
    "Trùng lắp EE3111 (TC) chỉ tính 1"
   ],
   [
    "CO3117",
    "Học máy",
    "other",
    "Nếu SV dùng môn EE3169 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3117 làm tự chọn tự do",
    "Trùng lắp EE3169 (TC) chỉ tính 1"
   ],
   [
    "EE2005",
    "Tín hiệu và hệ thống",
    "free",
    "",
    ""
   ],
   [
    "EE3029",
    "Thiết bị và hệ thống tự động",
    "free",
    "",
    ""
   ],
   [
    "EE3043",
    "Cấu trúc máy tính",
    "free",
    "",
    ""
   ],
   [
    "EE3057",
    "Nhập môn điều khiển thông minh",
    "free",
    "",
    ""
   ],
   [
    "EE3067",
    "Hệ thống điều khiển nhúng",
    "free",
    "",
    ""
   ],
   [
    "EE3069",
    "PLC",
    "free",
    "",
    ""
   ],
   [
    "EE3071",
    "SCADA",
    "free",
    "",
    ""
   ],
   [
    "EE3075",
    "Thiết bị và hệ thống tự động thủy khí",
    "free",
    "",
    ""
   ],
   [
    "EE3077",
    "Thị giác máy",
    "free",
    "",
    ""
   ],
   [
    "EE3079",
    "Điện tử công suất ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3087",
    "Bảo vệ rơle trong hệ thống điện",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3089",
    "Kỹ thuật cao áp",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3093",
    "Vận hành và điều khiển hệ thống điện",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3095",
    "Ổn định hệ thống điện",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3097",
    "Kỹ thuật an toàn điện",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "EE3099",
    "Kỹ thuật chiếu sáng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3101",
    "Kỹ thuật tiết kiệm và sử dụng hiệu quả điện năng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3131",
    "Hệ thống năng lượng xanh",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3133",
    "Thiết bị điện trong phân phối điện",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3135",
    "Kỹ thuật nhiệt lạnh",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3145",
    "Kỹ thuật ra quyết định",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3165",
    "Thiết kế vi mạch",
    "free",
    "",
    ""
   ],
   [
    "EE3167",
    "Thiết kế và phát triển ứng dụng IoT",
    "free",
    "",
    ""
   ],
   [
    "EE3171",
    "IoT trong công nghiệp và dân dụng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3179",
    "Truyền động điện",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EN1003",
    "Con người và môi trường",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EN1005",
    "Sinh thái học",
    "free",
    "",
    ""
   ],
   [
    "EN2051",
    "Độc học môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN3087",
    "Biến đổi khí hậu",
    "free",
    "",
    ""
   ],
   [
    "GE1013",
    "Khoa học trái đất",
    "free",
    "",
    ""
   ],
   [
    "IM1003",
    "Kinh tế học vi mô",
    "free",
    "",
    ""
   ],
   [
    "IM1013",
    "Kinh tế học đại cương",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1019",
    "Tiếp thị căn bản",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM1023",
    "Quản lý sản xuất cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1027",
    "Kinh tế kỹ thuật",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3001",
    "Quản trị kinh doanh cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3047",
    "Giao tiếp trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IU3087",
    "Độ tin cậy và đảm bảo chất lượng",
    "free",
    "",
    ""
   ],
   [
    "MA1003",
    "Cơ sở khoa học vật liệu",
    "free",
    "",
    ""
   ],
   [
    "ME1015",
    "Nguyên lý máy",
    "free",
    "",
    ""
   ],
   [
    "ME2005",
    "Trang bị điện - điện tử trong máy công nghiệp",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "ME2007",
    "Chi tiết máy",
    "free",
    "",
    ""
   ],
   [
    "ME2071",
    "Các quá trình chế tạo",
    "free",
    "",
    ""
   ],
   [
    "ME2125",
    "Quản lý logistics",
    "free",
    "",
    ""
   ],
   [
    "ME4217",
    "Điều khiển các hệ thống servo",
    "free",
    "",
    ""
   ],
   [
    "ME4625",
    "Kỹ năng lãnh đạo",
    "free",
    "",
    ""
   ],
   [
    "ME4633",
    "Nhân trắc học",
    "free",
    "",
    ""
   ],
   [
    "TR3121",
    "Hệ thống điện - điện tử ô tô",
    "free",
    "",
    ""
   ]
  ]
 },
 {
  "key": "Kỹ thuật Điện tử, Viễn thông",
  "label": "Kỹ thuật Điện tử - Viễn thông",
  "courses": [
   [
    "AS3075",
    "Cơ sở về laser và ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "AS3077",
    "Cơ sở vật lý sợi quang học và ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "AS3111",
    "Cơ sở thiết kế kỹ thuật",
    "free",
    "",
    ""
   ],
   [
    "CH2027",
    "Sinh học đại cương",
    "free",
    "",
    ""
   ],
   [
    "CH4065",
    "Vận hành hệ thống quy trình công nghệ hóa học",
    "free",
    "",
    ""
   ],
   [
    "CI1003",
    "Vẽ kỹ thuật",
    "free",
    "",
    ""
   ],
   [
    "CI1053",
    "Quản lý dự án xây dựng",
    "free",
    "",
    ""
   ],
   [
    "CI1069",
    "Khoa học trái đất",
    "free",
    "",
    ""
   ],
   [
    "CO1003",
    "Nhập môn về lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp EE2009 (BB)"
   ],
   [
    "CO1005",
    "Nhập môn điện toán",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE1001)"
   ],
   [
    "CO1007",
    "Cấu trúc rời rạc cho khoa học máy tính",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO1027",
    "Kỹ thuật lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp EE2009 (BB)"
   ],
   [
    "CO2001",
    "Kỹ năng chuyên nghiệp cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO2003",
    "Cấu trúc dữ liệu và giải thuật",
    "free",
    "",
    ""
   ],
   [
    "CO2007",
    "Kiến trúc máy tính",
    "other",
    "Nếu SV dùng môn EE3043 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO2007 làm tự chọn tự do",
    "Trùng lắp EE3043 (TC) Chỉ tính 1"
   ],
   [
    "CO2011",
    "Mô hình hóa toán học",
    "free",
    "",
    ""
   ],
   [
    "CO2013",
    "Hệ cơ sở dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO2017",
    "Hệ điều hành",
    "free",
    "",
    ""
   ],
   [
    "CO3001",
    "Công nghệ phần mềm",
    "free",
    "",
    ""
   ],
   [
    "CO3021",
    "Hệ quản trị cơ sở dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3029",
    "Khai phá dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3037",
    "Phát triển ứng dụng internet of things",
    "other",
    "Nếu SV dùng môn EE3167 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3037 làm tự chọn tự do",
    "Trùng lắp EE3167 (TC) Chỉ tính 1"
   ],
   [
    "CO3043",
    "Phát triển ứng dụng trên thiết bị di động",
    "free",
    "",
    ""
   ],
   [
    "CO3045",
    "Lập trình game",
    "free",
    "",
    ""
   ],
   [
    "CO3049",
    "Lập trình web",
    "free",
    "",
    ""
   ],
   [
    "CO3057",
    "Xử lý ảnh số và thị giác máy tính",
    "other",
    "Nếu SV dùng môn EE3035 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3057 làm tự chọn tự do",
    "Trùng lắp EE3035 (TC) Chỉ tính 1"
   ],
   [
    "CO3061",
    "Nhập môn trí tuệ nhân tạo",
    "other",
    "Nếu SV dùng môn EE3169 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3061 làm tự chọn tự do",
    "Trùng lắp EE3169 (TC) Chỉ tính 1"
   ],
   [
    "CO3069",
    "Mật mã và an ninh mạng",
    "free",
    "",
    ""
   ],
   [
    "CO3079",
    "Quản Trị Mạng",
    "free",
    "",
    ""
   ],
   [
    "CO3093",
    "Mạng máy tính",
    "other",
    "Nếu SV dùng môn EE3111 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3093 làm tự chọn tự do",
    "Trùng lắp EE3111 (TC) Chỉ tính 1"
   ],
   [
    "CO3117",
    "Học máy",
    "other",
    "Nếu SV dùng môn EE3169 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3117 làm tự chọn tự do",
    "Trùng lắp (EE3169) chỉ tính 1"
   ],
   [
    "EE1005",
    "Kỹ thuật điện",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "EE2003",
    "Trường điện từ",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE2011",
    "Kỹ thuật điện-điện tử",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "EE2017",
    "Cơ sở kỹ thuật điện",
    "free",
    "",
    ""
   ],
   [
    "EE2019",
    "Cơ sở điều khiển tự động",
    "free",
    "",
    ""
   ],
   [
    "EE2021",
    "Cơ sở điện tử công suất",
    "free",
    "",
    ""
   ],
   [
    "EE2039",
    "Vi xử lý",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE3001",
    "Hệ thống cung cấp điện",
    "free",
    "",
    ""
   ],
   [
    "EE3005",
    "Đo lường công nghiệp",
    "free",
    "",
    ""
   ],
   [
    "EE3013",
    "Giải tích hệ thống điện",
    "free",
    "",
    ""
   ],
   [
    "EE3029",
    "Thiết bị và hệ thống tự động",
    "free",
    "",
    ""
   ],
   [
    "EE3031",
    "Lập trình hệ thống nhúng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3035",
    "Xử lý ảnh",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3037",
    "Điện tử y sinh",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3041",
    "Xử lý tín hiệu số với FPGA",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3043",
    "Cấu trúc máy tính",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3057",
    "Nhập môn điều khiển thông minh",
    "free",
    "",
    ""
   ],
   [
    "EE3063",
    "Trí tuệ nhân tạo trong điều khiển",
    "free",
    "",
    ""
   ],
   [
    "EE3065",
    "Kỹ thuật robot",
    "free",
    "",
    ""
   ],
   [
    "EE3067",
    "Hệ thống điều khiển nhúng",
    "free",
    "",
    ""
   ],
   [
    "EE3075",
    "Thiết bị và hệ thống tự động thủy khí",
    "free",
    "",
    ""
   ],
   [
    "EE3077",
    "Thị giác máy",
    "free",
    "",
    ""
   ],
   [
    "EE3079",
    "Điện tử công suất ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3083",
    "Kỹ thuật số nâng cao",
    "free",
    "",
    "Môn cũ _ Tự chọn tự do"
   ],
   [
    "EE3085",
    "Mạng viễn thông",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3097",
    "Kỹ thuật an toàn điện",
    "free",
    "",
    ""
   ],
   [
    "EE3099",
    "Kỹ thuật chiếu sáng",
    "free",
    "",
    ""
   ],
   [
    "EE3105",
    "Kỹ thuật xung",
    "free",
    "",
    "Môn cũ _ Tự chọn tự do"
   ],
   [
    "EE3107",
    "Thông tin di động",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3111",
    "Mạng máy tính",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3113",
    "Quy trình thiết kế và sản xuất vi mạch",
    "other",
    "Môn học K14 -> không còn mở",
    "Môn học K14 -> không còn mở"
   ],
   [
    "EE3117",
    "Thiết kế vi mạch số",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3121",
    "Thiết kế vi mạch tương tự và hỗn hợp",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3127",
    "Anten - truyền sóng vô tuyến",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn chuyên ngành"
   ],
   [
    "EE3129",
    "Điện tử ứng dụng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3133",
    "Thiết bị điện trong phân phối điện",
    "free",
    "",
    ""
   ],
   [
    "EE3145",
    "Kỹ thuật ra quyết định",
    "free",
    "",
    ""
   ],
   [
    "EE3167",
    "Thiết kế và phát triển ứng dụng IoT",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3169",
    "Máy học cơ bản và ứng dụng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE3171",
    "IoT trong công nghiệp và dân dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3173",
    "Điều khiển chuyển động",
    "free",
    "",
    ""
   ],
   [
    "EE3177",
    "Chuyên đề điện tử - viễn thông",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE4449",
    "Kỹ thuật số nâng cao",
    "other",
    "Môn học của CTTT -> không mở cho CQ",
    "Môn học của CTTT -> không mở cho CQ"
   ],
   [
    "EE5148",
    "Thiết kế vi mạch cao tần",
    "other",
    "SV xem lại quy định trên BKSI",
    ""
   ],
   [
    "EE5154",
    "Thiết kế vi mạch số nâng cao",
    "other",
    "SV xem lại quy định trên BKSI",
    ""
   ],
   [
    "EE5156",
    "Thiết kế vi xử lý",
    "other",
    "SV xem lại quy định trên BKSI",
    ""
   ],
   [
    "EE5157",
    "Thiết kế hệ thống trên chip",
    "other",
    "SV xem lại quy định trên BKSI",
    ""
   ],
   [
    "EN1003",
    "Con người và môi trường",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "EN1005",
    "Sinh thái học",
    "free",
    "",
    ""
   ],
   [
    "EN2033",
    "Luật và chính sách môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN2051",
    "Độc học môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN3073",
    "An toàn lao động và vệ sinh môi trường công nghiệp",
    "free",
    "",
    ""
   ],
   [
    "EN3087",
    "Biến đổi khí hậu",
    "free",
    "",
    ""
   ],
   [
    "GE1013",
    "Khoa học trái đất",
    "free",
    "",
    ""
   ],
   [
    "GE3161",
    "Quản lý dự án trong kỹ thuật tài nguyên trái đất",
    "free",
    "",
    ""
   ],
   [
    "IM1009",
    "Kinh tế học vĩ mô",
    "free",
    "",
    ""
   ],
   [
    "IM1011",
    "Máy tính trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM1013",
    "Kinh tế học đại cương",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1017",
    "Thống kê trong kinh doanh",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1019",
    "Tiếp thị căn bản",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM1023",
    "Quản lý sản xuất cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1027",
    "Kinh tế kỹ thuật",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1029",
    "Hệ thống sản xuất",
    "free",
    "",
    ""
   ],
   [
    "IM2011",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM2017",
    "Hành vi tổ chức",
    "free",
    "",
    ""
   ],
   [
    "IM2031",
    "Quản lý sản xuất",
    "free",
    "",
    ""
   ],
   [
    "IM3001",
    "Quản trị kinh doanh cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3009",
    "Hệ thống tài chính",
    "free",
    "",
    ""
   ],
   [
    "IM3021",
    "Quản lý chuỗi cung ứng",
    "free",
    "",
    ""
   ],
   [
    "IM3029",
    "Quản lý công nghệ",
    "free",
    "",
    ""
   ],
   [
    "IM3047",
    "Giao tiếp trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM3051",
    "Đạo đức kinh doanh và trách nhiệm xã hội",
    "free",
    "",
    ""
   ],
   [
    "IM3055",
    "Quản lý nhân sự",
    "free",
    "",
    ""
   ],
   [
    "IM3061",
    "Anh văn trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM3069",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM3087",
    "Hệ thống thông tin quản lý",
    "free",
    "",
    ""
   ],
   [
    "IM4003",
    "Quản lý dự án",
    "free",
    "",
    ""
   ],
   [
    "IU3087",
    "Độ tin cậy và đảm bảo chất lượng",
    "free",
    "",
    ""
   ],
   [
    "MA5023",
    "Pin: từ cổ điển đến hiện đại",
    "free",
    "",
    ""
   ],
   [
    "ME2019",
    "Môi trường và con người",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "ME2111",
    "Thiết kế công việc và nhân trắc học",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "ME2125",
    "Quản lý logistics",
    "free",
    "",
    ""
   ],
   [
    "ME3009",
    "Các quá trình chế tạo",
    "free",
    "",
    ""
   ],
   [
    "ME3015",
    "Kỹ thuật robot",
    "other",
    "Nếu SV dùng môn EE3065 làm môn tự chọn chuyên ngành thì sẽ không được tính môn ME3015 làm tự chọn tự do",
    "Trùng lắp (EE3065) chỉ tính 1"
   ],
   [
    "ME4133",
    "Hệ thống PLC trong robot và tự động hóa",
    "other",
    "Nếu SV dùng môn EE3069 làm môn tự chọn chuyên ngành thì sẽ không được tính môn ME4133 làm tự chọn tự do",
    "Trùng lắp (EE3069) chỉ tính 1"
   ],
   [
    "ME4217",
    "Điều khiển các hệ thống servo",
    "other",
    "Nếu SV dùng môn EE3173 làm môn tự chọn chuyên ngành thì sẽ không được tính môn ME4217 làm tự chọn tự do",
    "Trùng lắp (EE3173) chỉ tính 1"
   ],
   [
    "ME4533",
    "Quản lý đơn hàng",
    "free",
    "",
    ""
   ],
   [
    "ME4625",
    "Kỹ năng lãnh đạo",
    "free",
    "",
    ""
   ],
   [
    "MT1017",
    "Giải tích trong kinh doanh",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "TR1005",
    "Cơ học thủy khí",
    "free",
    "",
    ""
   ],
   [
    "TR3001",
    "Cơ học bay",
    "free",
    "",
    ""
   ]
  ]
 },
 {
  "key": "Kỹ thuật điều khiển và TĐH",
  "label": "Kỹ thuật Điều khiển và Tự động hóa",
  "courses": [
   [
    "AS2051",
    "Tính toán khoa học",
    "free",
    "",
    ""
   ],
   [
    "CH2027",
    "Sinh học đại cương",
    "free",
    "",
    ""
   ],
   [
    "CH3001",
    "Thí nghiệm vi sinh thực phẩm",
    "free",
    "",
    ""
   ],
   [
    "CI1069",
    "Khoa học trái đất",
    "free",
    "",
    ""
   ],
   [
    "CI3289",
    "Lãnh đạo và khởi nghiệp",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CI4181",
    "Lãnh đạo và khởi nghiệp",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO1003",
    "Nhập môn về lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO1007",
    "Cấu trúc rời rạc cho khoa học máy tính",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO2001",
    "Kỹ năng chuyên nghiệp cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "CO2003",
    "Cấu trúc dữ liệu và giải thuật",
    "free",
    "",
    ""
   ],
   [
    "CO2007",
    "Kiến trúc máy tính",
    "free",
    "",
    ""
   ],
   [
    "CO2013",
    "Hệ cơ sở dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3027",
    "Thương mại điện tử",
    "free",
    "",
    ""
   ],
   [
    "CO3029",
    "Khai phá dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3035",
    "Hệ thời gian thực",
    "free",
    "",
    ""
   ],
   [
    "CO3037",
    "Phát triển ứng dụng internet of things",
    "other",
    "Nếu SV dùng môn EE3167 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3037 làm tự chọn tự do",
    "Trùng lắp EE3167 (TC) chỉ tính 1"
   ],
   [
    "CO3045",
    "Lập trình game",
    "free",
    "",
    ""
   ],
   [
    "CO3047",
    "Mạng máy tính nâng cao",
    "other",
    "Nếu SV dùng môn EE3111 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3047 làm tự chọn tự do",
    "Trùng lắp EE3111 (TC) chỉ tính 1"
   ],
   [
    "CO3049",
    "Lập trình web",
    "free",
    "",
    ""
   ],
   [
    "CO3053",
    "Hệ thống nhúng",
    "other",
    "Nếu SV dùng môn EE3003 hoặc môn EE3031 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3053 làm tự chọn tự do",
    "Trùng lắp EE3003, EE3031 (Chỉ tính 1)"
   ],
   [
    "CO3057",
    "Xử lý ảnh số và thị giác máy tính",
    "other",
    "Nếu SV dùng môn EE3077 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3057 làm tự chọn tự do",
    "Trùng lắp EE3077 (TC) chỉ tính 1"
   ],
   [
    "CO3059",
    "Đồ họa máy tính",
    "other",
    "Nếu SV dùng môn EE3077 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3059 làm tự chọn tự do",
    "Trùng lắp EE3077 (TC) chỉ tính 1"
   ],
   [
    "CO3061",
    "Nhập môn trí tuệ nhân tạo",
    "other",
    "Nếu SV dùng môn EE3063 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3061 làm tự chọn tự do",
    "Trùng lắp EE3063 (TC) chỉ tính 1"
   ],
   [
    "CO3069",
    "Mật mã và an ninh mạng",
    "free",
    "",
    ""
   ],
   [
    "CO3093",
    "Mạng máy tính",
    "other",
    "Nếu SV dùng môn EE3111 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3093 làm tự chọn tự do",
    "Trùng lắp EE3111 (TC) chỉ tính 1"
   ],
   [
    "CO3117",
    "Học máy",
    "other",
    "Nếu SV dùng môn EE3169 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3117 làm tự chọn tự do",
    "Trùng lắp EE3169 (TC) chỉ tính 1"
   ],
   [
    "EE2015",
    "Xử lý số tín hiệu",
    "free",
    "",
    ""
   ],
   [
    "EE3003",
    "Thiết kế hệ thống nhúng",
    "free",
    "",
    ""
   ],
   [
    "EE3009",
    "Máy điện",
    "free",
    "",
    ""
   ],
   [
    "EE3013",
    "Giải tích hệ thống điện",
    "free",
    "",
    ""
   ],
   [
    "EE3019",
    "Truyền số liệu và mạng",
    "free",
    "",
    ""
   ],
   [
    "EE3027",
    "Nhà máy điện và trạm biến áp",
    "free",
    "",
    ""
   ],
   [
    "EE3031",
    "Lập trình hệ thống nhúng",
    "free",
    "",
    ""
   ],
   [
    "EE3035",
    "Xử lý ảnh",
    "free",
    "",
    ""
   ],
   [
    "EE3037",
    "Điện tử y sinh",
    "free",
    "",
    ""
   ],
   [
    "EE3043",
    "Cấu trúc máy tính",
    "free",
    "",
    ""
   ],
   [
    "EE3057",
    "Nhập môn điều khiển thông minh",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3063",
    "Trí tuệ nhân tạo trong điều khiển",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3067",
    "Hệ thống điều khiển nhúng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3069",
    "PLC",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3071",
    "SCADA",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (Chỉ tính 1)"
   ],
   [
    "EE3075",
    "Thiết bị và hệ thống tự động thủy khí",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3077",
    "Thị giác máy",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3079",
    "Điện tử công suất ứng dụng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3093",
    "Vận hành và điều khiển hệ thống điện",
    "free",
    "",
    ""
   ],
   [
    "EE3097",
    "Kỹ thuật an toàn điện",
    "free",
    "",
    ""
   ],
   [
    "EE3099",
    "Kỹ thuật chiếu sáng",
    "free",
    "",
    ""
   ],
   [
    "EE3111",
    "Mạng máy tính",
    "free",
    "",
    ""
   ],
   [
    "EE3117",
    "Thiết kế vi mạch số",
    "free",
    "",
    ""
   ],
   [
    "EE3121",
    "Thiết kế vi mạch tương tự và hỗn hợp",
    "free",
    "",
    ""
   ],
   [
    "EE3129",
    "Điện tử ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3131",
    "Hệ thống năng lượng xanh",
    "free",
    "",
    ""
   ],
   [
    "EE3133",
    "Thiết bị điện trong phân phối điện",
    "free",
    "",
    ""
   ],
   [
    "EE3139",
    "Cảm biến và đo lường",
    "free",
    "",
    ""
   ],
   [
    "EE3143",
    "Điều khiển và ứng dụng các bộ biến đổi công suất",
    "free",
    "",
    ""
   ],
   [
    "EE3145",
    "Kỹ thuật ra quyết định",
    "free",
    "",
    ""
   ],
   [
    "EE3165",
    "Thiết kế vi mạch",
    "free",
    "",
    ""
   ],
   [
    "EE3167",
    "Thiết kế và phát triển ứng dụng IoT",
    "free",
    "",
    ""
   ],
   [
    "EE3169",
    "Máy học cơ bản và ứng dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3171",
    "IoT trong công nghiệp và dân dụng",
    "free",
    "",
    ""
   ],
   [
    "EE3173",
    "Điều khiển chuyển động",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EE3175",
    "Mô hình và mô phỏng hệ thống công nghiệp",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Tự chọn chuyên ngành (chỉ tính 1)"
   ],
   [
    "EN1003",
    "Con người và môi trường",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "EN1005",
    "Sinh thái học",
    "free",
    "",
    ""
   ],
   [
    "EN2033",
    "Luật và chính sách môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN2049",
    "Phân tích hệ thống môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN3087",
    "Biến đổi khí hậu",
    "free",
    "",
    ""
   ],
   [
    "EN3099",
    "Công nghệ xanh",
    "free",
    "",
    ""
   ],
   [
    "EN3109",
    "Công thái học",
    "free",
    "",
    ""
   ],
   [
    "GE1011",
    "Địa vật lý đại cương + kiến tập",
    "free",
    "",
    ""
   ],
   [
    "GE1013",
    "Khoa học trái đất",
    "free",
    "",
    ""
   ],
   [
    "GE2011",
    "Cơ sở khoa học địa chất dầu khí",
    "free",
    "",
    ""
   ],
   [
    "GE2033",
    "Tinh thể - khoáng vật - thạch học + thực tập",
    "free",
    "",
    ""
   ],
   [
    "GE2035",
    "Địa chất kiến trúc và đo vẽ bản đồ địa chất",
    "free",
    "",
    ""
   ],
   [
    "GE2043",
    "Địa tin học đại cương",
    "free",
    "",
    ""
   ],
   [
    "IM1003",
    "Kinh tế học vi mô",
    "free",
    "",
    ""
   ],
   [
    "IM1011",
    "Máy tính trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM1013",
    "Kinh tế học đại cương",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1015",
    "Kế toán tài chính",
    "free",
    "",
    ""
   ],
   [
    "IM1017",
    "Thống kê trong kinh doanh",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1019",
    "Tiếp thị căn bản",
    "free",
    "",
    ""
   ],
   [
    "IM1020",
    "Khởi nghiệp",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM1023",
    "Quản lý sản xuất cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1027",
    "Kinh tế kỹ thuật",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1029",
    "Hệ thống sản xuất",
    "free",
    "",
    ""
   ],
   [
    "IM3001",
    "Quản trị kinh doanh cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3029",
    "Quản lý công nghệ",
    "free",
    "",
    ""
   ],
   [
    "IM3047",
    "Giao tiếp trong kinh doanh",
    "free",
    "",
    ""
   ],
   [
    "IM3051",
    "Đạo đức kinh doanh và trách nhiệm xã hội",
    "free",
    "",
    ""
   ],
   [
    "IM3063",
    "Quản lý chất lượng",
    "free",
    "",
    ""
   ],
   [
    "IM3069",
    "Khởi nghiệp",
    "other",
    "Trùng lắp IM3069 Chỉ tính 1",
    "Trùng lắp IM3069 Chỉ tính 1"
   ],
   [
    "IM3075",
    "An toàn công nghiệp và quản lý rủi ro",
    "free",
    "",
    ""
   ],
   [
    "IM3081",
    "Quản trị kinh doanh quốc tế",
    "free",
    "",
    ""
   ],
   [
    "IM4003",
    "Quản lý dự án",
    "free",
    "",
    ""
   ],
   [
    "IU2021",
    "Tổ chức quản lý bảo dưỡng",
    "free",
    "",
    ""
   ],
   [
    "IU4019",
    "An toàn và môi trường trong bảo dưỡng",
    "free",
    "",
    ""
   ],
   [
    "ME4135",
    "Thiết kế hệ thống robot",
    "other",
    "Nếu SV dùng môn EE3065 làm môn tự chọn chuyên ngành thì sẽ không được tính môn ME4135 làm tự chọn tự do",
    "Trùng lắp (EE3065) chỉ tính 1"
   ],
   [
    "ME4533",
    "Quản lý đơn hàng",
    "free",
    "",
    ""
   ],
   [
    "ME4625",
    "Kỹ năng lãnh đạo",
    "free",
    "",
    ""
   ],
   [
    "TR1005",
    "Cơ học thủy khí",
    "free",
    "",
    ""
   ]
  ]
 },
 {
  "key": "Tăng cường Tiếng Nhật",
  "label": "Tăng cường Tiếng Nhật",
  "courses": [
   [
    "EE2033",
    "Giải tích mạch",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "EE3097",
    "Kỹ thuật an toàn điện",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc đối với ngành Kỹ thuật điện"
   ],
   [
    "MT2013",
    "Xác suất và thống kê",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ]
  ]
 },
 {
  "key": "Việt Pháp Viễn thông",
  "label": "Việt Pháp Viễn thông",
  "courses": [
   [
    "CO1003",
    "Nhập môn về lập trình",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Trùng lắp (EE2009)"
   ],
   [
    "CO2017",
    "Hệ điều hành",
    "free",
    "",
    ""
   ],
   [
    "CO3029",
    "Khai phá dữ liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3045",
    "Lập trình game",
    "free",
    "",
    ""
   ],
   [
    "CO3049",
    "Lập trình web",
    "free",
    "",
    ""
   ],
   [
    "CO3057",
    "Xử lý ảnh số và thị giác máy tính",
    "other",
    "Nếu SV dùng môn EE3035 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3057 làm tự chọn tự do",
    "Trùng lắp EE3035(TC) chỉ tính 1"
   ],
   [
    "CO3061",
    "Nhập môn trí tuệ nhân tạo",
    "other",
    "Nếu SV dùng môn EE3169 làm môn tự chọn chuyên ngành thì sẽ không được tính môn CO3061 làm tự chọn tự do",
    "Trùng lắp EE3169 (TC) chỉ tính 1"
   ],
   [
    "CO3069",
    "Mật mã và an ninh mạng",
    "free",
    "",
    ""
   ],
   [
    "EE2017",
    "Cơ sở kỹ thuật điện",
    "free",
    "",
    ""
   ],
   [
    "EE2019",
    "Cơ sở điều khiển tự động",
    "free",
    "",
    ""
   ],
   [
    "EE3031",
    "Lập trình hệ thống nhúng",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn chuyên ngành"
   ],
   [
    "EE3065",
    "Kỹ thuật robot",
    "free",
    "",
    ""
   ],
   [
    "EE3121",
    "Thiết kế vi mạch tương tự và hỗn hợp",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn chuyên ngành"
   ],
   [
    "EE3127",
    "Anten - truyền sóng vô tuyến",
    "once",
    "Chỉ được tính 1 lần (Hoặc là tự chọn chuyên ngành, hoặc là tự chọn tự do)",
    "Môn học tự chọn chuyên ngành"
   ],
   [
    "EE4061",
    "Kỹ thuật chiếu sáng (PBL)",
    "free",
    "",
    ""
   ],
   [
    "EN2033",
    "Luật và chính sách môi trường",
    "free",
    "",
    ""
   ],
   [
    "IM1021",
    "Khởi nghiệp",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học bắt buộc"
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM1027",
    "Kinh tế kỹ thuật",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM2033",
    "Tài chính doanh nghiệp",
    "free",
    "",
    ""
   ]
  ]
 },
 {
  "key": "VP Năng lượng",
  "label": "VP Năng lượng",
  "courses": [
   [
    "CI2001",
    "Sức bền vật liệu",
    "free",
    "",
    ""
   ],
   [
    "CO3027",
    "Thương mại điện tử",
    "free",
    "",
    ""
   ],
   [
    "EE2005",
    "Tín hiệu và hệ thống",
    "free",
    "",
    ""
   ],
   [
    "EE2039",
    "Vi xử lý",
    "free",
    "",
    ""
   ],
   [
    "EE3019",
    "Truyền số liệu và mạng",
    "free",
    "",
    ""
   ],
   [
    "EE3029",
    "Thiết bị và hệ thống tự động",
    "free",
    "",
    ""
   ],
   [
    "EE4051",
    "Thiết kế vi mạch (PBL)",
    "free",
    "",
    ""
   ],
   [
    "EN2033",
    "Luật và chính sách môi trường",
    "free",
    "",
    ""
   ],
   [
    "EN3087",
    "Biến đổi khí hậu",
    "free",
    "",
    ""
   ],
   [
    "IM1025",
    "Quản lý dự án cho kỹ sư",
    "excluded",
    "Không được tính là môn học tự chọn tự do",
    "Môn học loại trừ"
   ],
   [
    "IM3029",
    "Quản lý công nghệ",
    "free",
    "",
    ""
   ],
   [
    "MA3153",
    "Môi trường và an toàn nhà máy sản xuất và gia công vật liệu",
    "free",
    "",
    ""
   ],
   [
    "ME1015",
    "Nguyên lý máy",
    "free",
    "",
    ""
   ],
   [
    "ME2007",
    "Chi tiết máy",
    "free",
    "",
    ""
   ],
   [
    "ME2013",
    "Nhiệt động lực học và truyền nhiệt",
    "free",
    "",
    ""
   ],
   [
    "ME3003",
    "Dung sai và kỹ thuật đo",
    "free",
    "",
    ""
   ],
   [
    "ME3281",
    "Vật liệu học và xử lý",
    "free",
    "",
    ""
   ]
  ]
 }
];

/** Đoán ngành trong file của Khoa từ tên ngành / lớp của sinh viên; trả về key hoặc undefined. */
export function guessFreeMajor(...texts: (string | undefined)[]): string | undefined {
  const t = texts.filter(Boolean).join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  if (!t) return undefined;
  if (/dieu khien|tu dong|\bdth\b|dd\d+dth/.test(t)) return 'Kỹ thuật điều khiển và TĐH';
  if (/vien thong|dien tu|\bdtv|dtvt/.test(t)) return 'Kỹ thuật Điện tử, Viễn thông';
  if (/ky thuat dien\b|\bdd\d+d(ie|n)/.test(t)) return 'Kỹ thuật Điện';
  return undefined;
}
