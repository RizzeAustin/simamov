var socket = io.connect($(location).attr('host'));
//var socket = io();

$(document).ready(function() {
    //iterasi daftar rincian pok
    $("#loketProgram").change(function() {
        if ($("#loketProgram").val() != "Pilih Program") {
            console.log($("#loketProgram").val())
            socket.emit('mintaKegiatan', $("#loketProgram").val())
        } else {
            $("#loketKegiatan").empty().append('<option selected>Pilih Aktivitas</option>')
            $("#loketOutput").empty().append('<option selected>Pilih KRO</option>')
            $("#loketsOutput").empty().append('<option selected>Pilih RO</option>')
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketsKomponen").empty().append('<option selected>Pilih Sub Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok5").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit5").empty().append('<option selected>Pilih Detil</option>')
        }
    })
    $("#loketKegiatan").change(function() {
        if ($("#loketKegiatan").val() != "Pilih Aktivitas") {
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val()]
            console.log(s)
            socket.emit('mintaOutput', s)
        } else {
            $("#loketOutput").empty().append('<option selected>Pilih KRO</option>')
            $("#loketsOutput").empty().append('<option selected>Pilih RO</option>')
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketsKomponen").empty().append('<option selected>Pilih Sub Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok5").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit5").empty().append('<option selected>Pilih Detil</option>')
        }
    })
    $("#loketOutput").change(function() {
        if ($("#loketOutput").val() != "Pilih KRO") {
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val()]
            console.log(s)
            socket.emit('mintasOutput', s)
            socket.emit('mintaKomponen', s)
        } else {
            $("#loketsOutput").empty().append('<option selected>Pilih RO</option>')
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketsKomponen").empty().append('<option selected>Pilih Sub Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok5").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit5").empty().append('<option selected>Pilih Detil</option>')
        }
    })
    $("#loketKomponen").change(function() {
        if ($("#loketKomponen").val() != "Pilih Komponen") {
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val()]
            console.log(s)
            socket.emit('mintasKomponen', s)
            socket.emit('mintaAkun', s)
        } else {
            $("#loketsKomponen").empty().append('<option selected>Pilih Sub Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok5").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit5").empty().append('<option selected>Pilih Detil</option>')
        }
    })
    $("#loketAkun").change(function() {
        if ($("#loketAkun").val() != "Pilih Akun") {
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val(), $("#loketAkun").val()]
            console.log(s)
            socket.emit('mintaDetailPok', s)
            socket.emit('mintaDetailPokUnit', s)

        } else {
            $("#loketDetailPok1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPok5").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit1").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit2").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit3").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit4").empty().append('<option selected>Pilih Detil</option>')
            $("#loketDetailPokUnit5").empty().append('<option selected>Pilih Detil</option>')
        }
    })

    let sama = false

    socket.on('terimaKegiatan', function(kegiatan) {
        $("#loketKegiatan").empty().append('<option>Pilih Aktivitas</option>')
        for (let i = 0; i < kegiatan.length; i++) {
            let s = '<option value="' + kegiatan[i].kdgiat + '">' + kegiatan[i].kdgiat + ' ' + kegiatan[i].uraian + '</option>'
            $("#loketKegiatan > option").each(function() {
                if ($(this).val() == kegiatan[i].kdgiat) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketKegiatan").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaOutput', function(output) {
        $("#loketOutput").empty().append('<option>Pilih KRO</option>')
        for (let i = 0; i < output.length; i++) {
            let s = '<option value="' + output[i].kdoutput + '">' + output[i].kdoutput + ' ' + output[i].uraian + '</option>'
            $("#loketOutput > option").each(function() {
                if ($(this).val() == output[i].kdoutput) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketOutput").append(s)
            }
            sama = false
        }
    })
    socket.on('terimasOutput', function(soutput) {
        $("#loketsOutput").empty().append('<option>Pilih RO</option>')
        for (let i = 0; i < soutput.length; i++) {
            let s = '<option value="' + soutput[i].kdsoutput + '">' + soutput[i].kdsoutput + ' ' + soutput[i].ursoutput + '</option>'
            $("#loketsOutput > option").each(function() {
                if ($(this).val() == soutput[i].kdsoutput) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketsOutput").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaKomponen', function(komponen) {
        $("#loketKomponen").empty().append('<option>Pilih Komponen</option>')
        for (let i = 0; i < komponen.length; i++) {
            let s = '<option value="' + komponen[i].kdkmpnen + '">' + komponen[i].kdkmpnen + ' ' + komponen[i].urkmpnen + '</option>'
            $("#loketKomponen > option").each(function() {
                if ($(this).val() == komponen[i].kdkmpnen) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketKomponen").append(s)
            }
            sama = false
        }
    })
    socket.on('terimasKomponen', function(skomponen) {
        $("#loketsKomponen").empty().append('<option>Pilih Sub Komponen</option>')
        for (let i = 0; i < skomponen.length; i++) {
            let s = '<option value="' + skomponen[i].kdskmpnen + '">' + skomponen[i].kdskmpnen + ' ' + skomponen[i].urskmpnen + '</option>'
            $("#loketsKomponen > option").each(function() {
                if ($(this).val() == skomponen[i].kdskmpnen) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketsKomponen").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaAkun', function(akun) {
        $("#loketAkun").empty().append('<option>Pilih Akun</option>')
        for (let i = 0; i < akun.length; i++) {
            let s = '<option value="' + akun[i].kdakun + '">' + akun[i].kdakun + ' ' + akun[i].uraian + '</option>'
            $("#loketAkun > option").each(function() {
                if ($(this).val() == akun[i].kdakun) {
                    sama = true
                }
            })
            if (!sama) {
                $("#loketAkun").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaDetailPok', function(detail) {
        $("#loketDetailPok1").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPok2").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPok3").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPok4").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPok5").empty().append('<option>Pilih Detil</option>')
        for (let i = 0; i < detail.length; i++) {
            let s = '<option value="' + detail[i].nmitem + '">' + detail[i].nmitem + '</option>'
            $("#loketDetailPok1").append(s)
            $("#loketDetailPok2").append(s)
            $("#loketDetailPok3").append(s)
            $("#loketDetailPok4").append(s)
            $("#loketDetailPok5").append(s)
        }
    })
    socket.on('terimaDetailPokUnit', function(detail) {
        $("#loketDetailPokUnit1").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPokUnit2").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPokUnit3").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPokUnit4").empty().append('<option>Pilih Detil</option>')
        $("#loketDetailPokUnit5").empty().append('<option>Pilih Detil</option>')
        for (let i = 0; i < detail.length; i++) {
            let s = '<option value="' + detail[i].nmitem + '">' + detail[i].nmitem + '</option>'
            $("#loketDetailPokUnit1").append(s)
            $("#loketDetailPokUnit2").append(s)
            $("#loketDetailPokUnit3").append(s)
            $("#loketDetailPokUnit4").append(s)
            $("#loketDetailPokUnit5").append(s)
        }
        //$("#loketDetailPokUnit").append('<option id="customDetail" value="customDetail">[Usulkan detil baru]</option>')
    })

    // socket.on('terimaDetailDana', function(pagu) {
    //     if (pagu < $("#loketNilai").val()) {
    //         let sel = pagu - $("#loketNilai").val()
    //         $("#pokWarning").html('<p style="color: red; font-size: 13pt"><strong>DANA TIDAK CUKUP!</strong> (Rp ' + sel + ')</p>')
    //     } else {
    //         $("#pokWarning").html('')
    //     }
    // })

    //edit form initialization
    if ($('#loketDetailPok2, #loketDetailPokUnit2').val() != 'Pilih Detil' && $('#loketDetailPok2, #loketDetailPokUnit2').val()) {
        $('#nilaiDetil2').attr('disabled', false)
    } else {
        $('#nilaiDetil2').attr('disabled', true).empty()
    }
    if ($('#loketDetailPok3, #loketDetailPokUnit3').val() != 'Pilih Detil' && $('#loketDetailPok3, #loketDetailPokUnit3').val()) {
        $('#nilaiDetil3').attr('disabled', false)
    } else {
        $('#nilaiDetil3').attr('disabled', true).empty()
    }
    if ($('#loketDetailPok4, #loketDetailPokUnit4').val() != 'Pilih Detil' && $('#loketDetailPok4, #loketDetailPokUnit4').val()) {
        $('#nilaiDetil4').attr('disabled', false)
    } else {
        $('#nilaiDetil4').attr('disabled', true).empty()
    }
    if ($('#loketDetailPok5, #loketDetailPokUnit5').val() != 'Pilih Detil' && $('#loketDetailPok5, #loketDetailPokUnit5').val()) {
        $('#nilaiDetil5').attr('disabled', false)
    } else {
        $('#nilaiDetil5').attr('disabled', true).empty()
    }

    //dynamic form
    $('#loketDetailPok2, #loketDetailPokUnit2').change(function() {
        if ($('#loketDetailPok2, #loketDetailPokUnit2').val() != 'Pilih Detil' && $('#loketDetailPok2, #loketDetailPokUnit2').val()) {
            $('#nilaiDetil2').attr('disabled', false)
        } else {
            $('#nilaiDetil2').attr('disabled', true).empty()
        }
    })
    $('#loketDetailPok3, #loketDetailPokUnit3').change(function() {
        if ($('#loketDetailPok3, #loketDetailPokUnit3').val() != 'Pilih Detil' && $('#loketDetailPok3, #loketDetailPokUnit3').val()) {
            $('#nilaiDetil3').attr('disabled', false)
        } else {
            $('#nilaiDetil3').attr('disabled', true).empty()
        }
    })
    $('#loketDetailPok4, #loketDetailPokUnit4').change(function() {
        if ($('#loketDetailPok4, #loketDetailPokUnit4').val() != 'Pilih Detil' && $('#loketDetailPok4, #loketDetailPokUnit4').val()) {
            $('#nilaiDetil4').attr('disabled', false)
        } else {
            $('#nilaiDetil4').attr('disabled', true).empty()
        }
    })
    $('#loketDetailPok5, #loketDetailPokUnit5').change(function() {
        if ($('#loketDetailPok5, #loketDetailPokUnit5').val() != 'Pilih Detil' && $('#loketDetailPok5, #loketDetailPokUnit5').val()) {
            $('#nilaiDetil5').attr('disabled', false)
        } else {
            $('#nilaiDetil5').attr('disabled', true).empty()
        }
    })

}); //doc ready

function formatTanggal(date) {
    let monthNames = [
        "Januari", "Februari", "Maret",
        "April", "Mei", "Juni", "Juli",
        "Agustus", "September", "Oktober",
        "November", "Desember"
    ];
    let day = date.getDate();
    let monthIndex = date.getMonth();
    let year = date.getFullYear();
    return day + ' ' + monthNames[monthIndex] + ' ' + year;
};

function generalAlert(message) {
    $.toast({
        text: message,
        textAlign: 'left',
        hideAfter: 5000,
        loader: false,
        position: 'bottom-right',
        stack: 2
    })
};