_.each(data, function(item, index, list){
		    		var r = workbook.sheet(0).range('A'+row+':J'+row);
                    workbook.sheet(0).row(row).height(24);
                    if((sisa_item >= 3 && (row == next_last_jlh_link || row == 32))){
                        total_row_per_page = 29;
                        r.value([['',
                            'Jumlah dipindahkan', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '',
                            '',
                            ''
                        ]]);
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
                        workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                        workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                        //posisi checkpoint utk kalibrasi ttd
                        last_sum_sisa_item = sisa_item;

                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                        r.value([['',
                            'Jumlah pindahan', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '',
                            '',
                            ''
                        ]]);
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('F'+(row-1));
                        workbook.sheet(0).cell('G'+row).formula('G'+(row-1));
                        workbook.sheet(0).cell('H'+row).formula('H'+(row-1));
                        sum_pos = row;
                        next_last_jlh_link = sum_pos + total_row_per_page - 1;
                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                    }else if((total_row_per_page - last_sum_sisa_item) < 10 && (total_row_per_page - last_sum_sisa_item) >= -1 && sisa_item == 3 && !end){
                        end = true;
                        r.value([['',
                            'Jumlah dipindahkan', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '',
                            '',
                            ''
                        ]]);
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
                        workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                        workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                        last_sum = row;
                        row++;
                        for (var i = 0; i < total_row_per_page - last_sum_sisa_item + 1; i++) {
                            workbook.sheet(0).row(row).height(24);
                            row++;
                        }
                        if(total_row_per_page - last_sum_sisa_item + 2 > 1){
                            pair_sum = row;
                        }
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                        r.value([['',
                            'Jumlah pindahan', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '',
                            '',
                            ''
                        ]]);
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('F'+last_sum);
                        workbook.sheet(0).cell('G'+row).formula('G'+last_sum);
                        workbook.sheet(0).cell('H'+row).formula('H'+last_sum);
                        sum_pos = row;
                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                    }
                    //khusus row nama
		    		var value = [nmr,
		    			data[index]['nama'], 
		    			data[index]['gol'], 
		    			data[index]['jml_sks'], 
		    			data[index]['rate'], 
		    			data[index]['bruto'], 
		    			data[index]['pph'], 
		    			data[index]['diterima']
		    		];
		    		if(nmr % 2 == 0){
		    			value.push('')
		    			value.push('  '+nmr+'. ....')
		    		} else {
		    			value.push('  '+nmr+'. ....')
		    			value.push('')
		    		}
		    		r.value([value]);
		    		row++;
                    sisa_item--;
                    // console.log((sisa_item))
		    		nmr++;
		    	})
                //format uang
                workbook.sheet(0).range('E11'+':H'+(row-1)).style('numberFormat', '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)');
                workbook.sheet(0).range('A11'+':J'+(row-1)).style({'verticalAlignment': 'center', 'fontSize': 9});
                workbook.sheet(0).range('A11'+':A'+(row-1)).style('horizontalAlignment', 'center');
                workbook.sheet(0).range('C11'+':D'+(row-1)).style('horizontalAlignment', 'center');
		    	var r = workbook.sheet(0).range('A'+row+':J'+row);
		    	r.value([['',
	    			'JUMLAH', 
	    			'', 
	    			'', 
	    			'', 
	    			'', 
	    			'', 
	    			'',
	    			'',
	    			''
	    		]]);
	    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
	    		workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
	    		workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
	    		workbook.sheet(0).cell('I'+row).value(terbilang(total_terima));
	    		var jumlahcells = workbook.sheet(0).range('B'+row+':E'+row);
	    		jumlahcells.merged(true).style('horizontalAlignment', 'center');
	    		r.style({'verticalAlignment': 'center', 'numberFormat': '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)', 'fontSize': 9});
	    		var terb = workbook.sheet(0).range('I'+row+':J'+row);
	    		terb.merged(true).style('wrapText', true);
	    		workbook.sheet(0).row(row).height(78);
	    		var active_rows = workbook.sheet(0).range('A11'+':H'+row);
	    		active_rows.style('border', true);
	    		var ttd_cols1 = workbook.sheet(0).range('I11'+':I'+(row));
	    		ttd_cols1.style({'leftBorder': true, 'rightBorder': false, 'bottomBorder': true, 'topBorder': true})
	    		var ttd_cols2 = workbook.sheet(0).range('J11'+':J'+(row));
	    		ttd_cols2.style({'leftBorder': false, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

                //row yang dilompat;
                if(pair_sum){
                    var jumped_rows = workbook.sheet(0).range('A'+(last_sum+1)+':J'+(pair_sum-1));
                    jumped_rows.style({'leftBorder': false, 'rightBorder': false, 'bottomBorder': false, 'topBorder': false})
                }

		    	var r = workbook.sheet(0).range('B'+(row+2)+':H'+(row+8));
		    	r.value([
		    		['Lunas pada tanggal',,'Setuju dibayar',,,,'Jakarta, '+tgl_buat_surat],
		    		['Bendahara Pengeluaran STIS',,'Pejabat Pembuat Komitmen',,,,'Pembuat Daftar,'],
		    		[,,,,,,],
		    		[,,,,,,],
		    		[,,,,,,],
		    		['('+setting.bendahara.nama.capitalize()+')',,'('+setting.ppk.nama.capitalize()+')',,,,'('+pembuat_daftar.capitalize()+')'],
		    		['NIP. '+setting.bendahara._id.capitalize(),,'NIP. '+setting.ppk._id.capitalize(),,,,'NIP. '+pembuat_daftar_id],
		    		]);
		    	r.style('fontSize', 11)

                workbook.sheet(0).range('D'+(row+2)+':G'+(row+2)).merged(true);
                workbook.sheet(0).range('D'+(row+3)+':G'+(row+3)).merged(true);
                workbook.sheet(0).range('D'+(row+7)+':G'+(row+7)).merged(true);
                workbook.sheet(0).range('D'+(row+8)+':G'+(row+8)).merged(true);

                workbook.sheet(0).range('H'+(row+2)+':J'+(row+2)).merged(true);
                workbook.sheet(0).range('H'+(row+3)+':J'+(row+3)).merged(true);
                workbook.sheet(0).range('H'+(row+7)+':J'+(row+7)).merged(true);
                workbook.sheet(0).range('H'+(row+8)+':J'+(row+8)).merged(true);

                workbook.sheet(0).range('D'+(row+2)+':G'+(row+8)).style('horizontalAlignment', 'center');
                workbook.sheet(0).range('H'+(row+2)+':J'+(row+8)).style('horizontalAlignment', 'center');

		    	workbook.sheet(0).range('B'+(row+7)+':H'+(row+7)).style('underline', true);
		    	workbook.sheet(0).range('B'+(row+8)+':H'+(row+8)).style('underline', false);

		    	workbook.definedName("periode").value(periode);
                checkDirAndCreate('./temp_file/');
		        return workbook.toFileAsync('./temp_file/'+file_name+'.xlsx');