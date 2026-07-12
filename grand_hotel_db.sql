-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 12, 2026 at 08:51 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grand_hotel_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` int(11) NOT NULL,
  `reservation_id` int(11) NOT NULL,
  `guest_name` varchar(255) NOT NULL,
  `amount_due` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) NOT NULL DEFAULT 'Unpaid',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bills`
--

INSERT INTO `bills` (`id`, `reservation_id`, `guest_name`, `amount_due`, `status`, `notes`) VALUES
(1, 1, 'Namal Perera', 58500.00, 'Unpaid', 'Includes breakfast package.'),
(2, 2, 'Dilani Silva', 109500.00, 'Unpaid', 'Advance pending.'),
(7, 11, 'Ruwan', 30000.00, 'Paid', ''),
(8, 12, 'Amal', 25000.00, 'Paid', '');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100) NOT NULL,
  `department` varchar(100) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `name`, `role`, `department`, `phone`, `status`) VALUES
(1, 'Samitha Fernando', 'Housekeeper', 'Housekeeping', '+94 77 123 4567', 'Active'),
(2, 'Amal Jayawardena', 'Front Desk Agent', 'Reception', '+94 71 987 6543', 'Active'),
(7, 'ruwan', 'staff', 'support', '0714435241', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `category` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Ready',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `item_name`, `quantity`, `category`, `status`, `notes`) VALUES
(1, 'Bath Towels', 120, 'Linen', 'Ready', 'Routine reorder in 2 weeks.'),
(2, 'Mini Bar Water', 260, 'Beverages', 'Low Stock', 'Request extra delivery.');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `guest_name` varchar(255) NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `check_in` varchar(20) NOT NULL,
  `check_out` varchar(20) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`id`, `guest_name`, `room_number`, `check_in`, `check_out`, `status`, `amount`, `notes`) VALUES
(1, 'Namal Perera', '103', '2026-07-15', '2026-07-18', 'Confirmed', 58500.00, 'Early arrival requested.'),
(2, 'Dilani Silva', '202', '2026-07-20', '2026-07-23', 'Pending', 109500.00, 'Needs baby cot.'),
(11, 'Ruwan', '300', '2026-07-12', '2026-07-13', 'Confirmed', 30000.00, ''),
(12, 'Amal', '250', '2026-07-14', '2026-07-15', 'Confirmed', 0.00, '');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `room_number` varchar(10) NOT NULL,
  `room_type` varchar(50) NOT NULL,
  `floor` varchar(10) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 2,
  `rate_per_night` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('Available','Occupied','Reserved','Cleaning','Maintenance') NOT NULL DEFAULT 'Available',
  `condition` enum('Excellent','Good','Fair','Needs Repair') NOT NULL DEFAULT 'Excellent',
  `amenities` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_number`, `room_type`, `floor`, `capacity`, `rate_per_night`, `status`, `condition`, `amenities`, `notes`, `created_at`, `updated_at`) VALUES
(23, '101', 'Standard', '1', 2, 14500.00, 'Available', 'Excellent', 'Wi-Fi, Air Conditioning, TV', 'Near the reception area.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(24, '102', 'Standard', '1', 2, 14500.00, 'Occupied', 'Good', 'Wi-Fi, Air Conditioning, TV', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(25, '103', 'Deluxe', '1', 2, 19500.00, 'Reserved', 'Excellent', 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar', 'Late check-in expected.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(26, '201', 'Deluxe', '2', 2, 20500.00, 'Cleaning', 'Good', 'Wi-Fi, Air Conditioning, Smart TV, Balcony', 'Priority cleaning requested.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(27, '202', 'Suite', '2', 3, 36500.00, 'Available', 'Excellent', 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Jacuzzi', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(28, '203', 'Family', '2', 4, 31500.00, 'Maintenance', '', 'Wi-Fi, Air Conditioning, TV, Refrigerator', 'Bathroom tap replacement pending.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(29, '301', 'Suite', '3', 3, 38500.00, 'Occupied', 'Excellent', 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Balcony', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(30, '302', 'Deluxe', '3', 2, 22500.00, 'Available', 'Good', 'Wi-Fi, Air Conditioning, Smart TV', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(31, '303', 'Family', '3', 5, 33500.00, 'Reserved', 'Excellent', 'Wi-Fi, Air Conditioning, Two TVs, Refrigerator', 'Baby cot requested.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(32, '401', 'Suite', '4', 2, 42500.00, 'Cleaning', '', 'Wi-Fi, Air Conditioning, Smart TV, Mini Bar, Jacuzzi', 'Supervisor inspection after cleaning.', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(33, '402', 'Deluxe', '4', 2, 24500.00, 'Available', 'Excellent', 'Wi-Fi, Air Conditioning, Smart TV, Balcony', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43'),
(34, '403', 'Family', '4', 4, 34500.00, 'Occupied', 'Good', 'Wi-Fi, Air Conditioning, TV, Refrigerator', '', '2026-07-12 18:15:43', '2026-07-12 18:15:43');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`) VALUES
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin', 'System Administrator'),
(2, 'reception', '5145dba3b6bda2d610d2c5c435a1c2481eefd3146b6a7e004ad73f794386e031', 'Receptionist', 'Front Desk Reception'),
(3, 'accountant', '4d393ec34c3c6a875b95e66df5e6d6fc09efc33d66f12e3e98afca347d6b7638', 'Accountant', 'Accounts Executive'),
(4, 'staff', '10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6', 'Staff', 'Housekeeping Staff');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_number` (`room_number`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
