-- phpMyAdmin SQL Dump
-- version 4.4.14
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Aug 01, 2017 at 06:57 AM
-- Server version: 5.6.26
-- PHP Version: 5.6.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sipadu_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `dosen`
--

CREATE TABLE IF NOT EXISTS `dosen` (
  `kode_dosen` varchar(7) NOT NULL,
  `nama` varchar(50) DEFAULT NULL,
  `kode_jari_1` blob,
  `kode_jari_2` blob,
  `kode_jari_3` blob,
  `kode_jari_4` blob,
  `foto` mediumblob,
  `tempat_lahir` varchar(30) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `agama` varchar(10) DEFAULT NULL,
  `alamat` varchar(150) DEFAULT NULL,
  `no_telp` varchar(15) DEFAULT NULL,
  `no_hp` varchar(15) DEFAULT NULL,
  `dosen_pa` tinyint(1) unsigned DEFAULT NULL,
  `fungsional` tinyint(1) unsigned DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `status` enum('Kawin','Tidak Kawin') DEFAULT NULL,
  `gelar_depan` varchar(10) NOT NULL,
  `gelar_belakang` varchar(20) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `kode_pegawai` int(10) unsigned DEFAULT NULL,
  `aktif` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `unit` enum('STIS','BPS','Non STIS/BPS') DEFAULT NULL,
  `bidang_penelitian` text,
  `pangkat` enum('Lektor Kepala','Lektor','Asisten Ahli','Dosen Tidak Tetap') DEFAULT NULL,
  `gol_pajak` varchar(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

--
-- Dumping data for table `dosen`
--

INSERT INTO `dosen` (`kode_dosen`, `nama`, `kode_jari_1`, `kode_jari_2`, `kode_jari_3`, `kode_jari_4`, `foto`, `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin`, `agama`, `alamat`, `no_telp`, `no_hp`, `dosen_pa`, `fungsional`, `email`, `status`, `gelar_depan`, `gelar_belakang`, `username`, `kode_pegawai`, `aktif`, `unit`, `bidang_penelitian`, `pangkat`, `gol_pajak`) VALUES
('Abd001', 'Abdul Ghofar', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si, MTI.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Abd002', 'Abdul Rachman', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Drs.', 'S.E., Dipl.PT', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Abd003', 'Abdur Rohman', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Pd.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Abu002', 'Abuzar Asra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Prof. Dr.', '', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Ach001', 'Achmad Prasetyo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si., M.M.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Agu001', 'Agung Priyo Utomo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si., M.T.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Agu002', 'Agus Purwoto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ir.', 'M.Si.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Agu010', 'Agus Pramono', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.IP, M.PSDM', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Ais001', 'Aisyah Fitri Yuniasih', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'SST, SE, MSi', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Amb001', 'Ambarari Tri R', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Pd, M.Hum', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Amd001', 'Amdayon Agus Panyalai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Pd', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('And004', 'Andi Kurniawan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'SST, M.Si', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Anu001', 'Anugerah Karta Monika', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si, ME', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Ati001', 'Atik Maratis Suhartini', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.E, M.Si', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Bam001', 'Bambang Nurcahyo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.E., M.M.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Bon001', 'Bonivasius Prasetya Ichtiarto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', 'S.Si, M.Eng', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Bon002', 'Bony Parulian Josaphat', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Bud001', 'Budiasih', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', '', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Bud002', 'Budi Budiman', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.E', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Bud004', 'Budi Yuniarto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'SST, M.Si', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Bud005', 'Budyanra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.ST, M.Stat', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Cho001', 'Choiril Maksum', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'Ph.D', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Dar001', 'Daryanto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si., M.M.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Den001', 'Dendi Handiyatmo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.ST, M.Si.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Dew001', 'Dewita Nasution', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Sc.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Dew003', 'Dewi Triana', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Sos.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Dew005', 'Dewi Purwanti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'SST, SE, M.Si', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Dwi002', 'R. Dwi Harwin Kusmaryo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.E., M.A.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Efr001', 'Efri Diah Utami', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M. Stat', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Eka002', 'Ekaria', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ir.', 'M.Si.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Eka005', 'Eka Riezalita Pattinama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.IP', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Emi001', 'Emil Azman', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'MBA', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Ern001', 'Erni Tri Astuti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', 'M.Math.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Ern003', 'Ernawati Pasaribu', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', 'S.Si., M.E.', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Est001', 'Esti Suntari', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.H. M.Pd', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Far001', 'Farid Ridho', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'MT', NULL, NULL, 1, 'STIS', NULL, NULL, ''),
('Han001', 'Dra. Hanny Argadinata', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Hum.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Ird001', 'Irdam Ahmad', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Prof. Dr.', 'M.Stat', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Irl001', 'Irlan Indrocahyo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.E.,M.Si', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Jos001', 'Josep Rasmuli Tarigan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Drs.', 'M.M.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Lil001', 'Lilian Budianto', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Lus001', 'Lusia Sugiyati', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dra.', '', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Mar004', 'Marlina', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Pd.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Muh008', 'Muh. Kadarisman', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr', 'SH, M.Si', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Nur008', 'Nurusyifa', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Hum', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Nur010', 'Nur Indah Yusari', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Pd., M.Hum.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Nur011', 'Nur Ike Saptarini', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Psi.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Okt002', 'Oktavina Dhamayanti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Psi', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Pur001', 'Purwanto Ruslam ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ir.', '', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Rah002', 'Rahmah Purwahida', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Pd., M.Hum.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Rah004', 'Rahmi Yulia Ningsih', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Pd', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Ran001', 'Rany Komala Dewi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Psi.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Ren003', 'Reni Oktaviani', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Pd.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Rin006', 'Rinda Riztya', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.S, M.Pd', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Rob001', 'Roby Darmawan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.Eng.', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Sar005', 'Sari Novianti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Psi', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Sin001', 'Sintowati', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dra.', 'M.Pd.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Sla001', 'Slamet Sutomo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', '', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Sun003', 'Sunari Sarwono', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Drs', 'M.A', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Sur005', 'Suryo Guritno', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Prof.', '', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Sut001', 'Sutarno', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Drs.', 'M.M.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Tat001', 'Tati Irwati', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'M.A.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Ver001', 'Vera Lisna ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Dr.', 'S.Si, M.Phil', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Wid002', 'Wida Widiastuti', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Si, M.Sc', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Wid003', 'Widaryatmo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.ST., .M.Si', NULL, NULL, 1, 'BPS', NULL, NULL, ''),
('Wit001', 'Wita Septiani Rahmaputri', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.S., M.Pd.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Wyn001', 'Wynandin Imawan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Drs.', 'M.Sc.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Yud001', 'Yudi Anjangsana', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Pd., MM.', NULL, NULL, 1, 'Non STIS/BPS', NULL, NULL, ''),
('Yul002', 'Yulias Untari', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'S.Psi, Psi.', NULL, NULL, 1, 'BPS', NULL, NULL, '');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dosen`
--
ALTER TABLE `dosen`
  ADD PRIMARY KEY (`kode_dosen`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `FK_dosen_2` (`username`),
  ADD KEY `FK_dosen_3` (`kode_pegawai`) USING BTREE;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `dosen`
--
ALTER TABLE `dosen`
  ADD CONSTRAINT `FK_dosen_1` FOREIGN KEY (`kode_pegawai`) REFERENCES `pegawai` (`kode_pegawai`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_dosen_2` FOREIGN KEY (`username`) REFERENCES `autentifikasi_user` (`username`) ON DELETE SET NULL ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
