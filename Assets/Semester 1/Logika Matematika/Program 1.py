import customtkinter as ctk
from PIL import ImageTk,Image

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

root = ctk.CTk()
root.geometry("1000x500")
root.maxsize(1000,500)
root.minsize(1000,500)


root.title('Kalkulator Gerbang Logika')

locksym = 'unlock'
lockop = 'lock'
operator = ''
evaluable = ''
checkop = ''
notpresent = ''
lvar = []

def press(symbol):
    global locksym
    global lockop
    global lvar
    global operator
    global evaluable
    global checkop
    
    entry.configure(state='normal')
    if locksym == 'lock':
        infobox.configure(text='Harap masukkan operator yang benar')
    if locksym == 'unlock':
        if len(lvar) == 0:
            envar =' '+ entry.get() + str(symbol) + ' '
        else:
            envar = ' (' + entry.get() + str(symbol) + ' ) ' 
        lvar.append(symbol)
        entry.delete(0, 'end')
        entry.insert(0, envar)
        if operator == 'AND':
            lvar.append((lvar[-2]) and (lvar[-1]))
        if operator == 'OR':
            lvar.append((lvar[-2]) or (lvar[-1]))
        if operator == 'NAND':
            lvar.append(int(not(lvar[-2] and lvar[-1])))
        if operator == 'NOR':
            lvar.append(int(not(lvar[-2] or lvar[-1])))
        if operator == 'XOR':
            lvar.append(lvar[-2] ^ lvar[-1])
        if operator == 'XNOR':
            lvar.append(int(not(lvar[-2] ^ lvar[-1])))
        locksym = 'lock'
        lockop = 'unlock'
        if checkop == 'conf':
            evaluable = 'conf'
        infobox.configure(text='')
    entry.configure(state='disabled')

def clear():
    global locksym
    global lockop
    global lvar
    global operator
    global evaluable
    global checkop
    
    entry.configure(state='normal')
    entry.delete(0, 'end')
    lvar = []
    operator = ''
    lockop = 'lock'
    locksym ='unlock'
    checkop = ''
    evaluable = ''
    infobox.configure(text='')
    entry.configure(state='disabled')

def operate(op):
    global locksym
    global lockop
    global lvar
    global operator
    global evaluable
    global checkop    

    entry.configure(state='normal')
    
    if lockop == 'lock':
        infobox.configure(text='Harap masukkan nilai yang benar')
    if lockop == 'unlock':
        operator = op
        envar = entry.get() + str(op) + ' '
        entry.delete(0, 'end')
        entry.insert(0, envar)
        lockop = 'lock'
        locksym ='unlock'
        checkop = 'conf'
        infobox.configure(text='')
    entry.configure(state='disabled')
    
def notop(op):
    global locksym
    global lockop
    global lvar
    global operator
    global evaluable
    global checkop
    
    entry.configure(state='normal')
    
    if lockop == 'lock':
        infobox.configure(text='Harap masukkan nilai yang benar')
    if lockop == 'unlock':
        operator = op
        lvar[-1] = int(not lvar[-1])
        envar = '(NOT[' + entry.get() +']) '
        entry.delete(0, 'end')
        entry.insert(0, envar)
        checkop = 'confsp'
        infobox.configure(text='')
    entry.configure(state='disabled')
        
def eval():
    global lvar
    global evaluable
    global checkop
    entry.configure(state='normal')
    if checkop == 'confsp' or evaluable == 'conf':
        if (len(lvar) % 2) == 1 :
            enlvar = ' ' + str(lvar[-1]) + ' '
            entry.delete(0, 'end')
            entry.insert(0, enlvar)
            checkop = ''
            evaluable = ''
            infobox.configure(text='')
    else :
        infobox.configure(text='Inputan Salah!')
    entry.configure(state='disabled')

#PAGE 2nd


#Main layout
label_two = ctk.CTkLabel(root, text='')

#Entry box
entry = ctk.CTkEntry(root, width=950, height=70,font=('arial', 23, 'bold'),text_color='#ffffff', state='disabled')



#Info box
infobox = ctk.CTkLabel(root,text='',font=('arial', 20, 'bold'),text_color='#FF0000',fg_color='#000000')
#First row 
button0 = ctk.CTkButton(root, text='0',font=('arial', 29, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                        ,command=lambda: press(0))
button1 = ctk.CTkButton(root, text='1',font=('arial', 29, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                        ,command=lambda: press(1))
buttonclear = ctk.CTkButton(root, text='CLEAR',font=('arial', 26, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                            ,command= clear)

#Second row
buttonand = ctk.CTkButton(root, text='AND',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                          ,command= lambda: operate('AND'))
buttonor = ctk.CTkButton(root, text='OR',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                         ,command= lambda: operate('OR'))
buttonnot = ctk.CTkButton(root, text='NOT',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                          ,command= lambda: notop('NOT'))


#Third row
buttonnand = ctk.CTkButton(root, text='NAND',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                           ,command= lambda: operate('NAND'))
buttonnor = ctk.CTkButton(root, text='NOR',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                          ,command= lambda: operate('NOR'))
buttonxor = ctk.CTkButton(root, text='XOR',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                          ,command= lambda: operate('XOR'))


#Fourth row
buttonxnor = ctk.CTkButton(root, text='XNOR',font=('arial', 27, 'bold'),text_color='#ffffff' ,width=330, height=60,fg_color='#000000'
                           ,command= lambda: operate('XNOR'))
buttoncal = ctk.CTkButton(root, text='=',font=('arial', 26, 'bold'),text_color='#ffffff' ,width=660, height=60,fg_color='#000000'
                          ,command=eval)

buttontest = ctk.CTkLabel(root, text='TEST')



def show_page_two():

    
    #2nd page
    label_two.place(x=0, y=0, relwidth=1, relheight=1)
    #entry
    entry.grid(row=0, column=0, columnspan=4,pady=50, padx=25)
    #infobox
    infobox.grid(row=1, column=0, columnspan=5)
    #first row button
    button0.grid(row=2, column=0, columnspan=2,pady=5)
    button1.grid(row=2, column=2,pady=5)
    buttonclear.grid(row=2, column=3, columnspan=2, pady=5)
    #second row button
    buttonand.grid(row=3, column=0, columnspan=2,pady=5)
    buttonor.grid(row=3, column=2,pady=5)
    buttonnot.grid(row=3, column=3, columnspan=2,pady=5)
    #third row button
    buttonnand.grid(row=4, column=0, columnspan=2, pady=5)
    buttonnor.grid(row=4, column=2, pady=5)
    buttonxor.grid(row=4, column=3, columnspan=2, pady=5)
    #fourth row button
    buttonxnor.grid(row=5, column=0, columnspan=2, pady=5)
    buttoncal.grid(row=5, column=2, columnspan=3, pady=5)


    


show_page_two()


root.mainloop()
